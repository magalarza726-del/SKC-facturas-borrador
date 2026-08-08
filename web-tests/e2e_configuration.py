from __future__ import annotations
from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os, json
from threading import Thread
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1];DOCS=ROOT/'docs'
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*_): pass
@contextmanager
def server():
    h=partial(Quiet,directory=str(DOCS));s=ThreadingHTTPServer(('127.0.0.1',0),h);t=Thread(target=s.serve_forever,daemon=True);t.start()
    try: yield f'http://127.0.0.1:{s.server_port}/#settings'
    finally:s.shutdown();t.join(timeout=3)

with server() as url,sync_playwright() as p:
    b=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_EXECUTABLE'),args=['--no-sandbox'])
    c=b.new_context(viewport={'width':1440,'height':1050},accept_downloads=True);page=c.new_page();errors=[]
    page.on('console',lambda m: errors.append(m.text) if m.type=='error' else None);page.on('pageerror',lambda e: errors.append(str(e)))
    page.goto(url,wait_until='networkidle')
    expect(page.get_by_role('button',name='Preparación')).to_be_visible()
    page.get_by_role('button',name='Formularios').click()
    expect(page.get_by_role('heading',name='Diseñador de formularios')).to_be_visible()
    # Complete preset makes classification fields visible.
    page.get_by_role('button',name='Mostrar todo').click();page.wait_for_timeout(150)
    supplier_row=page.locator('[data-form-field="supplier"]');supplier_row.locator('[name="fieldLabel"]').fill('Proveedor / comercio')
    supplier_row.get_by_role('button',name='Subir').click()
    page.get_by_role('button',name='Guardar estructura').click();page.wait_for_timeout(150)
    page.goto(url.split('#')[0]+'#invoice',wait_until='networkidle')
    expect(page.locator('select[name="costCenter"]')).to_be_visible()
    expect(page.get_by_text('Proveedor / comercio',exact=True)).to_be_visible()
    assert page.locator('.field[data-config-field="supplier"]').evaluate('(el)=>[...el.parentElement.children].indexOf(el)') < page.locator('.field[data-config-field="client"]').evaluate('(el)=>[...el.parentElement.children].indexOf(el)')
    # Return to simple preset.
    page.goto(url,wait_until='networkidle');page.get_by_role('button',name='Formularios').click();page.get_by_role('button',name='Vista simple').click();page.wait_for_timeout(150)
    page.goto(url.split('#')[0]+'#invoice',wait_until='networkidle')
    expect(page.locator('select[name="costCenter"]')).to_be_hidden()
    expect(page.locator('input[name="amount"]')).to_be_visible()
    # Integration console exposes only public SPA values.
    page.goto(url,wait_until='networkidle');page.get_by_role('button',name='Integraciones').click()
    expect(page.get_by_role('heading',name='Microsoft Graph · configuración rápida')).to_be_visible()
    redirect=page.locator('#microsoftIntegrationForm input[name="redirectUri"]').input_value();assert redirect.startswith(url.split('#')[0])
    assert page.locator('input[name="clientSecret"]').count()==0
    # Portable configuration download.
    page.get_by_role('button',name='Reglas y respaldo').click()
    with page.expect_download() as di: page.get_by_role('button',name='Exportar configuración JSON').click()
    download=di.value;path=download.path();data=json.loads(Path(path).read_text());assert data['format']=='skc-app-configuration';assert data['schemaVersion']==1;assert 'forms' in data['settings'];assert 'integrations' in data['settings']
    if errors: raise AssertionError('\n'.join(errors))
    print('CONFIGURATION E2E OK')
    b.close()
