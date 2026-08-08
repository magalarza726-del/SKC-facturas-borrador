# Cambios

## 2.4.0 — Refactor y estabilidad

- Se corrigió una fuga crítica del respaldo: las sesiones Supabase ya no exportan access/refresh tokens.
- La sincronización respeta dependencias entre compras/transferencias y sus asientos contables para no publicar saldos sin documento fuente.
- La revisión de un duplicado exacto ya no puede simularse escribiendo manualmente una frase en Observaciones; queda registrada como metadata estructurada.
- Se persiste la Descripción base con ID y nombre legible; los catálogos ya no descartan silenciosamente descripciones sin Proyecto 2.
- El Excel oficial se ajustó a la estructura A:Q (17 columnas) observada en el formato SKC y usa fecha `d/m/yyyy`.
- Se añadió `appConfig` para sincronizar entre dispositivos el orden/visibilidad de formularios, reglas operativas y nombre de grupo.
- Solo administradores pueden cambiar o importar configuración compartida.
- Se normalizan URLs de Supabase aunque se pegue `/rest/v1/`, `/auth/v1/` o `/storage/v1/`.
- Se rechazan Secret keys (`sb_secret_...`) en el frontend.
- La descarga de eventos Supabase ahora usa paginación; se elimina el límite silencioso de 10.000 filas.
- Las llamadas simultáneas a sincronización comparten una sola ejecución y el estado visual siempre se libera aun si falla la red.
- Se impide operar con una sesión Supabase sin usuario interno vinculado cuando el bloqueo por correo está activado.
- Se reforzó detección de duplicados por hash de cada evidencia individual.
- Se corrigió la validación de evidencias obligatorias configurables en facturas y transferencias.
- Se restringen archivos a PDF/JPEG/PNG/WEBP/GIF/HEIC/HEIF y máximo 20 MB.
- Microsoft Graph limita URLs con bearer token al dominio oficial de Graph, expira PKCE y limpia callbacks fallidos.
- `Mail.Send` ya no se solicita por defecto: solo se agrega al activar Outlook.
- El Excel oficial se genera íntegramente en el navegador sin SheetJS/CDN y conserva encabezado azul, filtros, congelado y formatos monetarios.
- La escritura del Excel oficial en OneDrive se reserva a administradores y exige una sincronización previa cuando corresponde.
- Service worker actualizado a 2.4.0; el fallback de `index.html` solo se usa para navegación.
- El esquema Supabase elimina DELETE para eventos/evidencias, añade integridad de `id/entity/payload` y habilita `appConfig`.
- Se amplió GitHub Actions con smoke tests de archivos, datos, sincronización, Graph y Excel.

## 2.3.0 — Integraciones y Excel oficial

- Integraciones visibles desde Configuración.
- Exportación a Excel oficial SKC.
- Configuración y carga del Excel a OneDrive mediante Microsoft Graph.
- Diseñador de formularios y configuración JSON portable.
- Asistente Microsoft Graph con OAuth Authorization Code + PKCE.
- Integración Telegram mediante proxy seguro / Supabase Edge Function.

## 2.1.0 — Vista dual escritorio/móvil

- Selector persistente entre modo Escritorio y modo Móvil.
- Interfaz móvil para Inicio, Factura, Historial, Recordatorios, Mensajes, Flujo, Configuración y Manual.
- Formularios y acciones comparten la misma base de datos y lógica en ambas vistas.

## 2.0.0 — GitHub Pages

- Versión web estática publicable desde `docs/`.
- IndexedDB local y sincronización multiusuario opcional con Supabase.
- PWA, historial, duplicados, recordatorios, mensajes, transferencias, flujo y conciliación.
