# Cambios solicitados — SKC Facturas 2.5.0

## Aplicados

- Dalton, Evelyn, Javier, Karen y Tito quedan como usuarios base reales, con saldo inicial 0.
- Se elimina Usuario Demo y se deduplican usuarios por nombre normalizado.
- Se corrigió un bug descubierto durante la migración: los IDs predeterminados podían colisionar por normalización de mayúsculas.
- Supabase Storage es el almacenamiento principal recomendado de evidencias.
- Nuevas evidencias: `facturas/YYYY/MM/DD/CODIGO/NN_CODIGO.ext`.
- Historial incorpora **Ver evidencia** con galería/deslizador para todas las imágenes/PDF de la compra.
- Historial incorpora **Descargar evidencia**; con varios archivos genera un ZIP.
- Se elimina el módulo/botón Manual de las rutas activas y del service worker.
- Una sola aplicación maneja roles ADMIN/USUARIO.
- ADMIN: vista global, Configuración, auditoría, ajustes/reversos, Excel/CSV.
- USUARIO: solo su ámbito operativo, movimientos, mensajes, flujo y evidencias relacionadas.
- Se corrige el problema “Supabase vacío pero sigo viendo movimientos”: después de un pull remoto completo se retiran del espejo IndexedDB los elementos marcados como SINCRONIZADOS que ya no existen remotamente. No se borran elementos pendientes para evitar pérdidas.
- Microsoft Graph/OneDrive permanece disponible como integración opcional, no como requisito de evidencias.
