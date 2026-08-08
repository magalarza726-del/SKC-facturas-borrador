# SKC Facturas Web 2.4.0

Versión refactorizada y endurecida para el piloto multiusuario de SKC. Mantiene la interfaz **Escritorio/Móvil**, IndexedDB local, sincronización con Supabase, flujo contable, transferencias, recordatorios, detección de duplicados, evidencias, Microsoft Graph, Telegram y el Excel oficial SKC.

## Novedades de estabilidad 2.4.0

- Formularios y reglas administrativas se sincronizan entre dispositivos mediante `appConfig`.
- Respaldo endurecido: no exporta sesiones Supabase ni secretos heredados.
- Dependencias de sincronización protegen el libro contable cuando falla el documento fuente.
- Sincronización Supabase paginada, coalescida y con recuperación correcta de estado ante errores.
- URL de Supabase normalizada y bloqueo explícito de Secret keys en el navegador.
- Vinculación obligatoria entre sesión Supabase y usuario interno cuando está activado el bloqueo por correo.
- Validaciones de archivos, hashes individuales de evidencias y campos configurables obligatorios reforzadas.
- Microsoft Graph usa permisos mínimos; `Mail.Send` solo se solicita cuando Outlook está activado.
- Generador XLSX local, sin CDN, con estructura oficial SKC A:Q (17 columnas), fecha `d/m/yyyy` y funcionamiento offline.
- Excel oficial en OneDrive restringido a administradores para reducir sobrescrituras concurrentes.
- Service worker actualizado y seguro: el fallback HTML solo se aplica a navegación, no a módulos JavaScript.
- Esquema Supabase sin borrado de eventos y con restricciones de integridad.

## Publicación

El contenido publicable está en `docs/`. El workflow `.github/workflows/pages.yml` valida código, almacenamiento, archivos, sincronización, Graph y Excel antes de desplegar.

Para una base real compartida, ejecute o vuelva a ejecutar `docs/supabase-schema.sql` en Supabase SQL Editor. La migración es idempotente y añade el tipo `appConfig` requerido por la configuración compartida.

Documentos clave: `LAUNCH_CHECKLIST.md`, `SUPABASE_SETUP_10_MIN.md`, `GRAPH_SETUP_10_MIN.md`, `TELEGRAM_SETUP.md`, `ANDROID_NATIVE_READINESS.md` y `BUGFIX_REPORT_2.4.0.md`.
