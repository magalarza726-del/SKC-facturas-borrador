# Lista de lanzamiento del prototipo 2.5.0

## Obligatorio antes de usar facturas reales

- [ ] Publicar `docs/` de la versión 2.5.0 y limpiar el service worker/cache anterior.
- [ ] En el proyecto Supabase existente, volver a ejecutar `docs/supabase-schema.sql` (migración idempotente).
- [ ] Confirmar que existen Dalton, Evelyn, Javier, Karen y Tito, todos con saldo inicial `$0.00`.
- [ ] Asignar el primer rol `ADMIN` desde Configuración y dejar al resto como `USUARIO` según corresponda.
- [ ] Vincular el correo de cada usuario con su cuenta Supabase e iniciar sesión en dos navegadores distintos.
- [ ] Confirmar que un `USUARIO` no ve Configuración, auditoría, ajustes/reversos ni exportaciones administrativas.
- [ ] Confirmar que el `ADMIN` sí ve la información global y las herramientas administrativas.
- [ ] Cargar descripciones, Proyecto 2, centros de costo y demás catálogos reales.
- [ ] Revisar Formularios: visibilidad, obligatoriedad, etiquetas, valores por defecto y orden.
- [ ] Probar una compra de prueba en dos navegadores y repetir la sincronización varias veces.
- [ ] Adjuntar 2 o más evidencias a una compra y verificar **Ver evidencia** (anterior/siguiente) y **Descargar evidencia** desde el segundo navegador.
- [ ] En Supabase Storage, comprobar que los archivos queden en `skc-evidence/facturas/YYYY/MM/DD/CODIGO/`.
- [ ] Probar un duplicado exacto y una compra similar sin comprobante.
- [ ] Probar una transferencia y confirmar que solo afecta el saldo al aceptarse.
- [ ] Si `skc_events` está vacío, sincronizar y confirmar que no permanezcan movimientos antiguos marcados como sincronizados en el navegador.
- [ ] Descargar y abrir el Excel oficial; verificar columnas A:Q contra el Historial.
- [ ] Descargar un respaldo completo antes de comenzar el piloto.

## Microsoft / OneDrive (opcional)

- [ ] Mantener Microsoft desactivado si Supabase Storage será el repositorio principal de evidencias.
- [ ] Si se desea un respaldo adicional en OneDrive, crear App Registration SPA y configurar Tenant ID + Client ID.
- [ ] Activar Outlook únicamente si realmente se usarán correos.

## Seguridad del piloto

- [ ] Mantener autorregistro público desactivado y vinculación por correo activa.
- [ ] Trabajar inicialmente con usuarios de confianza. Los roles 2.5.0 se aplican en la interfaz y lógica de negocio; para producción definitiva conviene endurecer también autorización RLS por rol en el servidor.
