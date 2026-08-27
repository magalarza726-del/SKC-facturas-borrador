# SKC Facturas Web

Versión publicada: **3.3.6**.

Esta rama conserva el historial anterior del repositorio, pero GitHub Pages se despliega desde el paquete validado:

`release/SKC_Facturas_Web_GitHub_3.3.6.zip`

El workflow `.github/workflows/pages.yml` descomprime la versión, ejecuta validaciones estáticas y pruebas funcionales, y publica `docs/` en GitHub Pages.

## Arquitectura actual

- Supabase como fuente de verdad compartida con Android.
- Usuarios y roles ADMIN / USUARIO.
- Compras, ingresos, transferencias, mensajes, recordatorios y evidencias.
- Base de datos administrativa y exportación CSV/XLSX.
- Excel reconstruido desde el histórico, sin reutilizar el archivo del día anterior.
- Compatibilidad con Supabase Storage / Cloudflare R2.
- PWA para escritorio y móvil.

## Seguridad

No se publican secretos de Supabase Service Role, credenciales de R2 ni contraseñas. La configuración pública del cliente se realiza desde la aplicación.

## Despliegue

Cada actualización del paquete 3.3.6 o del workflow en `main` dispara la validación y el despliegue de GitHub Pages.
