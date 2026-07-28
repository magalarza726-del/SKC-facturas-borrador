# Pruebas de la versión web

## Lógica e IndexedDB

```bash
node --experimental-default-type=module web-tests/store-smoke.mjs
```

## Estructura estática

```bash
python web-tests/validate_static.py
```

## Prueba real en Chromium

```bash
pip install playwright
playwright install chromium
python web-tests/e2e.py
```

La prueba abre un servidor local temporal, crea dos usuarios, registra un gasto, envía y confirma una transferencia, revisa los saldos, navega por todos los módulos y comprueba una recarga sin conexión.

La variable opcional `CHROMIUM_EXECUTABLE` permite indicar un Chromium ya instalado.
