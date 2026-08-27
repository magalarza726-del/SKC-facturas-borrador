# SKC Facturas Web

Versión publicada: **3.3.6**.

## Sitio publicado

**GitHub Pages:** https://magalarza726-del.github.io/SKC-facturas-borrador/

La aplicación web 3.3.6 se publica mediante GitHub Actions después de reconstruir y verificar el paquete de distribución almacenado en `release/b64/`.

El workflow `.github/workflows/pages.yml`:

1. reconstruye el ZIP de distribución;
2. verifica su SHA-256;
3. comprueba la integridad del ZIP;
4. ejecuta validaciones estáticas y de sintaxis;
5. ejecuta las pruebas funcionales de almacenamiento, archivos, sincronización, Excel y exportación portable;
6. publica únicamente `docs/` en GitHub Pages.

## Arquitectura actual

- Supabase como fuente de verdad compartida con Android.
- Usuarios y roles ADMIN / USUARIO.
- Compras, ingresos, transferencias, mensajes, recordatorios y evidencias.
- Base de datos administrativa y exportación CSV/XLSX.
- Excel reconstruido desde el histórico, sin reutilizar el archivo del día anterior.
- Compatibilidad con Supabase Storage / Cloudflare R2.
- PWA para escritorio y móvil.

## Excel

La versión web usa la estrategia estable definida para 3.3.6: genera una exportación nueva desde los datos históricos y evita arrastrar una cadena de cálculo obsoleta (`calcChain.xml`).

## Seguridad

No se publican secretos de Supabase Service Role, credenciales de R2 ni contraseñas. La configuración pública del cliente se realiza desde la aplicación.

## Despliegue

Los cambios en `release/b64/**` o en `.github/workflows/pages.yml` disparan automáticamente la validación y el despliegue de GitHub Pages.

Último despliegue validado: **GitHub Actions — success**.
