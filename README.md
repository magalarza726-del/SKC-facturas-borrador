# SKC Facturas Web 2.5.0

Versión para piloto multiusuario de SKC con interfaz **Escritorio/Móvil**, IndexedDB local-first, Supabase como backend compartido, Supabase Storage para evidencias, flujo contable, transferencias, recordatorios, duplicados, Excel oficial y roles de acceso.

## Cambios principales 2.5.0

- Usuarios reales precargados: **Dalton, Evelyn, Javier, Karen y Tito**, con saldo inicial `$0.00`.
- Eliminación automática de `Usuario Demo` y deduplicación de usuarios repetidos.
- Roles en una sola aplicación: **ADMIN** ve configuración, auditoría, ajustes, exportaciones y vista global; **USUARIO** opera y consulta únicamente su ámbito.
- Se elimina Manual de la navegación.
- Supabase Storage es el repositorio principal de fotos/PDF. Microsoft Graph/OneDrive permanece como integración opcional.
- Historial permite **Ver evidencia** en una galería con anterior/siguiente y **Descargar evidencia**; múltiples archivos se empaquetan en ZIP.
- Evidencias remotas organizadas por código SKC en `facturas/año/mes/día/CODIGO/`.
- Reconciliación remota: si Supabase está vacío o un evento sincronizado deja de existir remotamente, el espejo local ya no sigue mostrando ese dato antiguo. Los datos locales aún pendientes no se borran automáticamente.
- Se conserva la exportación al Excel oficial SKC y el resto de funciones de 2.4.0.

## Primer administrador

En una instalación limpia todos los usuarios nacen como `USUARIO`. Mientras no exista ningún `ADMIN`, Configuración permanece disponible para asignar el primer administrador. Desde ese momento, solo un administrador puede volver a entrar a Configuración y modificar usuarios/reglas compartidas.

## Publicación

El sitio publicable está en `docs/`. Para Supabase, ejecute o vuelva a ejecutar `docs/supabase-schema.sql`; es idempotente. El bucket privado `skc-evidence` almacena las evidencias.

Antes de actualizar un piloto, exporte un respaldo. Después de desplegar `docs/`, limpie el service worker/cache de la versión anterior.

Consulte `RELEASE_2.5.0.md` y `VALIDATION_REPORT_2.5.0.txt` para los detalles de esta entrega.
