# Informe de bugs y refactor — SKC Facturas Web 2.4.0

Fecha de revisión: 7 de agosto de 2026.

La revisión se hizo sobre la versión 2.3.0 manteniendo el comportamiento funcional ya validado en el piloto: IndexedDB local, Supabase multiusuario, flujo contable, transferencias, recordatorios, mensajes, evidencias, modos Escritorio/Móvil, Microsoft Graph, Telegram y Excel oficial.

## Correcciones de mayor impacto

1. **Respaldo exponía la sesión de Supabase.** El respaldo completo podía incluir `access_token` y `refresh_token`. Ahora se eliminan las sesiones y secretos antes de exportar; la importación tampoco acepta esos valores.
2. **Riesgo de saldo remoto sin su documento fuente.** Si fallaba la publicación de una compra o transferencia, su asiento de libro podía intentar sincronizarse por separado. La cola ahora respeta dependencias: primero fuente, después libro/recordatorio relacionado.
3. **Configuración de formularios no era realmente compartida.** Orden, visibilidad, reglas y nombre de grupo ahora se publican como `appConfig` y se sincronizan por Supabase.
4. **Identidad interna podía quedar desalineada con la sesión Supabase.** Con bloqueo por correo activo, la app impide operar si el correo autenticado no coincide con un usuario SKC activo.
5. **Sincronización con límites y estados frágiles.** Se añadió paginación, coalescencia de sincronizaciones simultáneas y liberación garantizada del estado `running` aun cuando falle la red.
6. **Conflictos de versiones remotas.** El esquema incorpora una regla `keep newest`; el cliente verifica el evento remoto después del upsert y adopta la versión más reciente cuando corresponde.
7. **Duplicados podían saltarse escribiendo manualmente el texto de revisión.** La excepción de duplicado ahora requiere una justificación pasada por el flujo de revisión; la app genera metadatos estructurados `duplicateReview` y el texto de auditoría por sí misma.
8. **La descripción base seleccionada no se guardaba de forma canónica.** Ahora se persisten `descriptionBaseId` y el nombre legible `descriptionBase`, evitando perder ese contexto en exportaciones e integraciones.
9. **Una descripción de catálogo sin Proyecto 2 desaparecía silenciosamente.** Ya no se elimina del catálogo al guardar; queda visible para que Administración pueda completar o revisar su configuración.
10. **Evidencias inconsistentes.** Se centralizaron extensiones/MIME aceptados, límite de 20 MB y SHA-256; se rechazan archivos vacíos o no compatibles y se detecta duplicidad por cada archivo, no solo por el conjunto.
11. **Microsoft Graph solicitaba permisos más amplios de lo necesario.** `Mail.Send` solo se incluye cuando Outlook está habilitado; PKCE expira, los callbacks se limpian y el bearer token solo puede enviarse al origen oficial de Microsoft Graph.
12. **Excel dependía de una librería/CDN externa.** Se reemplazó por un escritor XLSX local, usable offline. Además, el formato oficial se ajustó a la estructura A:Q de la referencia SKC: FECHA, columnas auxiliares de semana/mes/clasificación, DESCRIPCIÓN, PROYECTO2, centros de costo, Cliente, Factura, INGRESO, EGRESO, RESPONSABLE, GRUPO y OBSERVACIONES, con fecha `d/m/yyyy`.
13. **Actualización simultánea del Excel desde el mismo dispositivo.** Las cargas a OneDrive se coalescen y solo un administrador puede publicar el archivo oficial.
14. **Service worker podía devolver HTML a una petición de módulo JavaScript.** El fallback de `index.html` queda limitado a navegaciones y todos los módulos locales necesarios se precachean con cache 2.4.0.
15. **Saldo de usuarios inactivos podía ocultarse en Inicio.** La vista de escritorio usa ahora el saldo calculado real, igual que la vista móvil.
16. **Importar un respaldo en modo combinar sobrescribía conexión/sesión local.** La combinación importa datos y evidencias sin reemplazar la configuración del dispositivo; “Reemplazar todo” conserva su semántica separada.
17. **Configuración portable arrastraba estado del dispositivo.** Ya no exporta/importa `profileUserId`, `lastSyncAt` ni estado del piloto; también rechaza una `sb_secret_...`.
18. **URL de Supabase fácil de pegar incorrectamente.** La app normaliza automáticamente URLs que incluyan `/rest/v1/`, `/auth/v1/` o `/storage/v1/` y rechaza Secret keys en el navegador.

## Refactor de mantenibilidad

Se reescribieron/ordenaron los módulos de IndexedDB (`db.js`), sincronización (`sync.js`), archivos (`files.js`), Microsoft Graph (`graph.js`) y generación XLSX (`excel-writer.js`). Se separaron constantes de evidencias, normalización de scopes, reglas de dependencia de sincronización y tipos de columnas del Excel para reducir números mágicos y facilitar la futura migración a Android nativo.

La lógica crítica se mantuvo fuera de la interfaz siempre que fue posible: validación de duplicados, usuarios, saldo, confirmación/rechazo de transferencias, archivos y configuración compartida se validan también en el almacén/lógica de negocio y no solo en los formularios.

## Riesgos que permanecen para producción

- Las políticas RLS actuales son apropiadas para **un equipo cerrado de usuarios autenticados y de confianza**, pero todavía no aplican el rol interno `ADMIN/USUARIO` en el servidor. Un usuario autenticado con conocimientos técnicos podría intentar escribir directamente por REST fuera de la interfaz. Para producción debe añadirse autorización por rol/tenant en backend.
- La resolución de conflictos usa marcas de tiempo de los clientes. Un dispositivo con reloj muy incorrecto puede afectar el orden de una actualización. Para una producción de mayor escala conviene usar revisiones/versiones de servidor.
- Si varios administradores habilitan simultáneamente la actualización automática del mismo Excel de OneDrive, dos dispositivos podrían competir por el archivo. Para el piloto debe habilitarse `autoUpload` únicamente en el equipo administrativo designado.
- El navegador de este entorno bloquea la ejecución E2E contra `localhost`; por eso la batería final cubre sintaxis, IndexedDB, negocio, sincronización simulada, Graph simulado y OOXML. Las pruebas reales multiusuario ya realizadas por el usuario sobre Supabase complementan esa limitación.

## Migración obligatoria desde 2.3.x

Antes de usar 2.4.0 contra el proyecto Supabase existente, vuelva a ejecutar `docs/supabase-schema.sql` en SQL Editor. Es idempotente y no elimina las compras existentes. Añade `appConfig`, restricciones de integridad, protección de versión y políticas actualizadas.
