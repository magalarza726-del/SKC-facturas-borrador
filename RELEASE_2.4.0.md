# SKC Facturas Web 2.4.0

Entrega enfocada en estabilidad y mantenibilidad sin retirar funciones de 2.3.0.

## Cambios principales

- Configuración compartida de formularios, reglas y grupo mediante Supabase (`appConfig`).
- Respaldo seguro: tokens de sesión y secretos no salen del navegador.
- Sincronización con dependencias para impedir publicar un asiento si falló su compra/transferencia fuente.
- Duplicados exactos con revisión estructurada y justificación, no mediante texto manual.
- Descripción base persistida de forma canónica y catálogos sin pérdidas silenciosas.
- Excel oficial alineado a la estructura A:Q (17 columnas) de SKC y fecha `d/m/yyyy`.
- Refactor legible de IndexedDB, sincronización, archivos, Graph y Excel.
- Paginación de eventos Supabase y sincronizaciones concurrentes coalescidas.
- Control de identidad para evitar registrar operaciones con un usuario interno distinto al autenticado.
- Detección de duplicados mejorada con SHA-256 por archivo.
- Validación estricta de formatos y tamaño de evidencias.
- Permisos mínimos en Microsoft Graph; Outlook añade `Mail.Send` solo cuando se habilita.
- XLSX oficial generado localmente, sin dependencia de CDN.
- Publicación del Excel en OneDrive limitada a administradores.
- Service worker 2.4.0 con cache y fallbacks corregidos.
- Event Store sin DELETE desde usuarios autenticados y con validaciones de identidad de fila/payload.

## Migración necesaria

En proyectos Supabase ya creados, vuelva a ejecutar `docs/supabase-schema.sql`. No borra compras existentes; actualiza restricciones, políticas y permite sincronizar `appConfig`.
