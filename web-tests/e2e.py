from __future__ import annotations
from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os
from threading import Thread
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / 'docs'
SHOT = ROOT / 'web-tests' / 'skc-web-preview.png'

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

@contextmanager
def static_server():
    handler = partial(QuietHandler, directory=str(DOCS))
    server = ThreadingHTTPServer(('127.0.0.1', 0), handler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f'http://127.0.0.1:{server.server_port}/#home'
    finally:
        server.shutdown()
        thread.join(timeout=3)

with static_server() as url, sync_playwright() as p:
    launch_options={'headless':True,'args':['--no-sandbox']}
    if os.environ.get('CHROMIUM_EXECUTABLE'):
        launch_options['executable_path']=os.environ['CHROMIUM_EXECUTABLE']
    browser = p.chromium.launch(**launch_options)
    context = browser.new_context(viewport={'width': 1440, 'height': 1100})
    page = context.new_page()
    console_errors = []
    page.on('console', lambda msg: console_errors.append(f'console: {msg.text}') if msg.type == 'error' else None)
    page.on('pageerror', lambda exc: console_errors.append(f'pageerror: {exc}'))

    page.goto(url, wait_until='networkidle')
    expect(page.get_by_role('heading', name='SKC · Facturas')).to_be_visible(timeout=15000)

    page.locator('a[href="#settings"]').first.click()
    expect(page.get_by_role('heading', name='Configuración')).to_be_visible()
    page.get_by_role('button', name='Agregar usuario').first.click()
    modal = page.locator('.modal')
    modal.locator('input[name="name"]').fill('Karen')
    modal.locator('input[name="email"]').fill('karen@example.com')
    modal.locator('input[name="transferEnabled"]').check()
    modal.get_by_role('button', name='Guardar usuario').click()
    expect(page.get_by_text('Karen', exact=True).first).to_be_visible()

    page.locator('a[href="#invoice"]').first.click()
    expect(page.get_by_role('heading', name='Subir factura o compra')).to_be_visible()
    form = page.locator('#invoiceForm')
    form.locator('input[name="amount"]').fill('10')
    form.locator('select[name="evidenceStatus"]').select_option(label='Compra sin comprobante')
    form.locator('#descriptionId').select_option(index=1)
    form.locator('select[name="project"]').select_option(index=1)
    form.locator('select[name="costCenter"]').select_option(index=1)
    form.locator('select[name="secondaryCost"]').select_option(index=1)
    form.get_by_role('button', name='Guardar y publicar').click()
    expect(page.get_by_text('Registro creado')).to_be_visible()
    expect(page.locator('tbody').filter(has_text='SKC-').first).to_be_visible()

    page.locator('a[href="#flow"]').first.click()
    expect(page.get_by_role('heading', name='Flujo y conciliación')).to_be_visible()
    expect(page.locator('.flow-table tbody tr').filter(has_text='Usuario Demo')).to_contain_text('10.00')

    page.locator('a[href="#messages"]').first.click()
    expect(page.get_by_role('heading', name='Mensajes', exact=True)).to_be_visible()
    transfer = page.locator('#transferForm')
    transfer.locator('input[name="amount"]').fill('25')
    transfer.locator('select[name="recipientUserId"]').select_option(label='Karen')
    transfer.locator('textarea[name="reason"]').fill('Reembolso de compra en sitio')
    transfer.get_by_role('button', name='Enviar aviso').click()
    expect(page.get_by_text('Transferencia registrada')).to_be_visible()

    page.locator('#currentUserSelect').select_option(label='Karen')
    expect(page.get_by_role('heading', name='Mensajes', exact=True)).to_be_visible()
    page.get_by_role('button', name='Confirmar').click()
    expect(page.get_by_text('Transferencia confirmada')).to_be_visible()

    page.locator('a[href="#flow"]').first.click()
    expect(page.get_by_role('heading', name='Flujo y conciliación')).to_be_visible()
    expect(page.locator('.flow-table tbody tr').filter(has_text='Karen')).to_contain_text('25.00')

    # Open the remaining routes to catch integration errors.
    for route, heading in [('reminders','Recordatorios'),('history','Historial'),('manual','Manual de uso'),('settings','Configuración'),('home','SKC · Facturas'),('flow','Flujo y conciliación')]:
        page.locator(f'a[href="#{route}"]').first.click()
        expect(page.get_by_role('heading', name=heading, exact=True)).to_be_visible()

    # The service worker must permit an offline reload after the first load.
    page.evaluate('navigator.serviceWorker.ready')
    page.reload(wait_until='networkidle')
    expect(page.get_by_role('heading', name='Flujo y conciliación', exact=True)).to_be_visible()
    context.set_offline(True)
    page.reload(wait_until='domcontentloaded')
    expect(page.get_by_role('heading', name='Flujo y conciliación', exact=True)).to_be_visible(timeout=15000)
    context.set_offline(False)

    page.screenshot(path=str(SHOT), full_page=True)
    if console_errors:
        raise AssertionError('\n'.join(console_errors))
    print(f'E2E OK: {SHOT}')
    browser.close()
