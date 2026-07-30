# SKC Facturas Web 2.1.0

Aplicación web estática para registrar compras, evitar duplicados, manejar recordatorios y transferencias, y calcular saldos desde un libro de movimientos auditable.

## Vista escritorio y vista móvil

La misma aplicación incluye dos interfaces completas que trabajan sobre los mismos datos:

- **Escritorio:** navegación horizontal, tablas amplias y formularios distribuidos en columnas.
- **Móvil:** interfaz tipo aplicación, cabecera compacta, navegación inferior, tarjetas y formularios optimizados para teléfonos.

El selector **Escritorio / Móvil** aparece en la barra superior. La selección queda guardada en el navegador. En una pantalla pequeña, la primera apertura usa automáticamente el modo móvil.

## Publicar en GitHub Pages

1. Suba todo el contenido de esta carpeta a un repositorio GitHub.
2. Abra **Settings → Pages**.
3. Seleccione **GitHub Actions** como fuente.
4. El workflow incluido publica automáticamente `docs/`.

La aplicación funciona en modo local con IndexedDB. Para compartir datos entre usuarios, configure Supabase desde la propia aplicación y ejecute `docs/supabase-schema.sql`.

Consulte `GITHUB_PAGES.md` para el procedimiento completo y las reglas de seguridad.
