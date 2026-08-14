# Pruebas web

- `validate_static.py`: archivos, imports, manifest, service worker, Supabase schema y workflow.
- `store-smoke.mjs`: IndexedDB simulado, cinco usuarios base en cero, roles, compras, duplicados, mensajes, flujo, configuración y reconciliación remota.
- `sync-smoke.mjs`: URL Supabase, rutas de evidencias, paginación de 1.001 eventos y dependencias del libro contable.
- `files-smoke.mjs`: validación y hashes de evidencias.
- `evidence-smoke.mjs`: descarga múltiple de evidencias como ZIP local.
- `static-smoke.mjs`: presencia de galería/descarga, separación de roles y retirada de Manual.
- `graph-smoke.mjs`: integración Microsoft opcional (PKCE, scopes y subida simulada).
- `excel-smoke.mjs` + `validate_excel.py`: generador OOXML del Excel oficial.

Los scripts E2E históricos permanecen como referencia. En el entorno de construcción actual Chromium bloquea `localhost` por política administrativa; por ello la entrega 2.5.0 se valida con smoke tests y validación estática/OOXML, además de las pruebas reales de GitHub Pages + Supabase realizadas durante el piloto.
