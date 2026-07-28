# SKC Facturas Web 2.0.0

Aplicación web estática para registrar compras, evitar duplicados, manejar recordatorios y transferencias, y calcular saldos desde un libro de movimientos auditable.

## Publicar en GitHub Pages

1. Suba todo el contenido de esta carpeta a un repositorio GitHub.
2. Abra **Settings → Pages**.
3. Seleccione **GitHub Actions** como fuente.
4. El workflow incluido publica automáticamente `docs/`.

La aplicación funciona en modo local con IndexedDB. Para compartir datos entre usuarios, configure Supabase desde la propia aplicación y ejecute `docs/supabase-schema.sql`.

Consulte `GITHUB_PAGES.md` para el procedimiento completo y las reglas de seguridad.
