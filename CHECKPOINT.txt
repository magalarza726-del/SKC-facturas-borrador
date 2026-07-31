from __future__ import annotations
from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os
from threading import Thread
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
DOCS=ROOT/'docs'
SHOT=ROOT/'web-tests'/'skc-mobile-preview.png'

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self,*_args): pass

@contextmanager
def static_server():
    handler=partial(QuietHandler,directory=str(DOCS))
    server=ThreadingHTTPServer(('127.0.0.1',0),handler)
    thread=Thread(target=server.serve_forever,daemon=True);thread.start()
    try: yield f'http://127.0.0.1:{server.server_port}/#home'
    finally: server.shutdown();thread.join(timeout=3)

with static_server() as url,sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_EXECUTABLE') or None,args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':1440,'height':1050})
    page=context.new_page();errors=[]
    page.on('console',lambda m: errors.append(f'console: {m.text}') if m.type=='error' else None)
    page.on('pageerror',lambda e: errors.append(f'pageerror: {e}'))
    page.goto(url,wait_until='networkidle')
    expect(page.get_by_role('heading',name='SKC · Facturas')).to_be_visible()
    page.get_by_role('button',name='Ver modo móvil').click()
    expect(page.locator('html')).to_have_attribute('data-view-mode','mobile')
    expect(page.locator('.mobile-live-card')).to_be_visible()
    expect(page.get_by_role('button',name='Subir factura',exact=False)).to_be_visible()
    # Persisted after reload.
    page.reload(wait_until='networkidle')
    expect(page.locator('html')).to_have_attribute('data-view-mode','mobile')
    # Traverse every mobile screen.
    for route,title,selector in [
        ('invoice','Subir factura','#invoiceForm'),
        ('history','Historial','.mobile-tabs'),
        ('reminders','Recordatorios','.mobile-summary'),
        ('messages','Mensajes','.mobile-message-actions'),
        ('flow','Flujo','.mobile-live-card'),
        ('settings','Configuración','.mobile-settings-menu'),
        ('manual','Manual','.mobile-accordion'),
        ('home','SKC Ingeniería · Facturas','.mobile-module-grid'),
    ]:
        page.goto(url.split('#')[0]+f'#{route}',wait_until='networkidle')
        expect(page.locator('#mobilePageTitle')).to_have_text(title)
        expect(page.locator(selector).first).to_be_visible()
    # Open both message composers.
    page.goto(url.split('#')[0]+'#messages',wait_until='networkidle')
    page.get_by_role('button',name='Solicitar monto',exact=False).click()
    expect(page.locator('#fundRequestForm')).to_be_visible()
    page.get_by_role('button',name='Volver a Mensajes').click()
    page.get_by_role('button',name='Enviar transferencia',exact=False).click()
    # Demo user can be transfer-disabled, so screen must still render either the form or permission warning.
    expect(page.locator('.mobile-form-section')).to_be_visible()
    # Settings drill-down and return.
    page.goto(url.split('#')[0]+'#settings',wait_until='networkidle')
    page.get_by_role('button',name='Catálogos',exact=False).click()
    expect(page.locator('#settingsPanel')).to_be_visible()
    page.get_by_role('button',name='Volver a Configuración').click()
    expect(page.locator('.mobile-settings-menu')).to_be_visible()
    # Switch back to desktop using the mobile header control.
    page.locator('#mobileViewToggle').click()
    expect(page.locator('html')).to_have_attribute('data-view-mode','desktop')
    expect(page.locator('.topbar')).to_be_visible()
    # Return mobile for the final screenshot.
    page.locator('#mobileViewButton').click()
    page.goto(url.split('#')[0]+'#home',wait_until='networkidle')
    page.screenshot(path=str(SHOT),full_page=True)
    if errors: raise AssertionError('\n'.join(errors))
    print(f'DUAL VIEW E2E OK: {SHOT}')
    browser.close()
