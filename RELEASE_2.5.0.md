# SKC Facturas Web 2.5.0

## Alcance

Esta entrega mantiene la arquitectura y funciones de 2.4.0 y añade los cambios solicitados para el piloto real: usuarios base reales en cero, roles Administrador/Usuario, evidencias privadas en Supabase, galería/descarga desde Historial, eliminación del botón Manual y reconciliación del espejo local con la base remota.

## Usuarios base

- Dalton — `$0.00`
- Evelyn — `$0.00`
- Javier — `$0.00`
- Karen — `$0.00`
- Tito — `$0.00`

`Usuario Demo` se elimina durante la migración. Los saldos futuros se calculan exclusivamente desde el libro contable.

## Evidencias

Supabase Storage (`skc-evidence`) es el repositorio primario. Las facturas se organizan como:

`facturas/YYYY/MM/DD/CODIGO/01_CODIGO.ext`

En Historial, cada compra con adjuntos ofrece **Ver evidencia** y **Descargar evidencia**. La vista muestra imágenes y PDF, permite avanzar/retroceder entre todos los archivos y descarga un ZIP cuando hay más de uno.

## Roles

Una única aplicación maneja los dos perfiles:

- **ADMIN:** vista global, Configuración, usuarios, auditoría, ajustes/reversos, Excel/CSV y administración.
- **USUARIO:** operación diaria y consulta de sus movimientos, mensajes, flujo y evidencias relacionadas.

En una instalación limpia existe un modo de bootstrap: mientras no haya ADMIN, Configuración sigue visible para designar el primero.

## Reconciliación Supabase ↔ IndexedDB

Después de descargar completamente `skc_events`, la aplicación compara las claves remotas con el espejo local. Un registro local con estado `SINCRONIZADO` que ya no existe en Supabase se retira del navegador, junto con su caché de evidencia cuando corresponde. Los elementos `PENDIENTE` o con error se conservan para no perder trabajo sin publicar.

## Actualización

1. Respalde el piloto actual.
2. Reemplace `docs/` por la versión 2.5.0.
3. Ejecute `docs/supabase-schema.sql` en el mismo proyecto Supabase.
4. Espere GitHub Pages y limpie cache/service worker.
5. Abra Configuración, asigne el primer `ADMIN` y vincule los correos reales.
6. Sincronice. Si `skc_events` está vacío, los datos locales antiguos ya marcados como sincronizados se reconciliarán automáticamente.
