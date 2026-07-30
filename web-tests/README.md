# Pruebas web

- `validate_static.py`: valida archivos, imports, manifest, service worker y workflow.
- `store-smoke.mjs`: prueba operaciones principales del almacén usando IndexedDB simulado.
- `e2e.py`: flujo funcional completo en modo escritorio.
- `e2e_dual_view.py`: cambio de vista, persistencia y apertura de todas las pantallas móviles.
- `e2e_mobile_functional.py`: flujo móvil con usuario, factura, recordatorio, solicitud, transferencia, confirmación y saldo.

Ejemplo:

```bash
CHROMIUM_EXECUTABLE=/usr/lib/chromium/chromium python web-tests/e2e.py
```
