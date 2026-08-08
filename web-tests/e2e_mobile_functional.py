from __future__ import annotations
from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os
from threading import Thread
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1];DOCS=ROOT/'docs'
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*_): pass
@contextmanager
def server():
    h=partial(Quiet,directory=str(DOCS));s=ThreadingHTTPServer(('127.0.0.1',0),h);t=Thread(target=s.serve_forever,daemon=True);t.start()
    try: yield f'http://127.0.0.1:{s.server_port}/#home'
    finally:s.shutdown();t.join(timeout=3)

with server() as url,sync_playwright() as p:
    b=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_EXECUTABLE'),args=['--no-sandbox'])
    c=b.new_context(viewport={'width':430,'height':932});page=c.new_page();errors=[]
    page.on('console',lambda m: errors.append(m.text) if m.type=='error' else None)
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.goto(url,wait_until='networkidle')
    expect(page.locator('html')).to_have_attribute('data-view-mode','mobile')
    # Add a second user through mobile settings detail.
    page.goto(url.split('#')[0]+'#settings',wait_until='networkidle')
    page.get_by_role('button',name='Perfil y usuario',exact=False).click()
    page.get_by_role('button',name='Agregar usuario').click()
    modal=page.locator('.modal');modal.locator('input[name="name"]').fill('Karen');modal.locator('input[name="email"]').fill('karen@example.com');modal.locator('input[name="transferEnabled"]').check();modal.get_by_role('button',name='Guardar usuario').click()
    expect(page.get_by_text('Karen',exact=True).first).to_be_visible()
    # Mobile invoice form.
    page.goto(url.split('#')[0]+'#invoice',wait_until='networkidle')
    f=page.locator('#invoiceForm');f.locator('input[name="amount"]').fill('12.50');f.locator('#descriptionId').select_option(index=1);f.locator('select[name="project"]').select_option(index=1);f.locator('#noReceiptSwitch').locator('xpath=..').click();f.get_by_role('button',name='Guardar y enviar').click()
    expect(page.get_by_text('Registro creado')).to_be_visible()
    # Reminder create and postpone.
    page.goto(url.split('#')[0]+'#reminders',wait_until='networkidle');page.locator('#mobileAddReminder').click();modal=page.locator('.modal');modal.locator('textarea').fill('Almuerzo proyecto RE-S11.01');modal.get_by_role('button',name='Crear recordatorio').click();expect(page.get_by_text('Almuerzo proyecto RE-S11.01')).to_be_visible();page.get_by_role('button',name='Posponer',exact=False).first.click();modal=page.locator('.modal');modal.locator('input').fill('90');modal.get_by_role('button',name='Posponer').click();expect(page.get_by_text('Recordatorio pospuesto.')).to_be_visible()
    # Request amount.
    page.goto(url.split('#')[0]+'#messages',wait_until='networkidle');page.get_by_role('button',name='Solicitar monto',exact=False).click();rf=page.locator('#fundRequestForm');rf.locator('input[name="amount"]').fill('40');rf.locator('select[name="recipientUserId"]').select_option(label='Karen');rf.locator('textarea[name="reason"]').fill('Materiales para mantenimiento');rf.get_by_role('button',name='Enviar solicitud').click();expect(page.get_by_text('Solicitud creada')).to_be_visible()
    # Transfer and confirmation.
    page.get_by_role('button',name='Enviar transferencia',exact=False).click();tf=page.locator('#transferForm');tf.locator('input[name="amount"]').fill('25');tf.locator('select[name="recipientUserId"]').select_option(label='Karen');tf.locator('textarea[name="reason"]').fill('Reembolso compra en sitio');tf.get_by_role('button',name='Enviar mensaje').click();expect(page.get_by_text('Transferencia registrada')).to_be_visible()
    page.locator('#mobileCurrentUserSelect').select_option(label='Karen');page.wait_for_timeout(250);page.goto(url.split('#')[0]+'#messages',wait_until='networkidle');page.get_by_role('button',name='Confirmar').click();expect(page.get_by_text('Transferencia confirmada')).to_be_visible()
    page.goto(url.split('#')[0]+'#flow',wait_until='networkidle');expect(page.locator('.mobile-balance-row').filter(has_text='KAREN')).to_contain_text('$25.00')
    if errors: raise AssertionError('\n'.join(errors))
    print('MOBILE FUNCTIONAL E2E OK')
    b.close()
