# SKC Facturas Web 2.0.0 — Publicación en GitHub Pages

Esta versión reemplaza la interfaz PySide6 por una aplicación web estática en HTML, CSS y JavaScript. El contenido publicable está dentro de `docs/` y no necesita Python, Node.js ni un proceso de compilación en GitHub Pages.

## Publicación recomendada

1. Cree un repositorio **privado** o público en GitHub y suba este proyecto.
2. Use `main` como rama principal y haga `push`.
3. Abra **Settings → Pages**.
4. En **Build and deployment → Source**, seleccione **GitHub Actions**.
5. Ejecute el flujo **Deploy GitHub Pages** o espere el primer despliegue automático.
6. Abra la URL indicada por el job `deploy`.

El archivo `.github/workflows/pages.yml` valida y publica la carpeta `docs/`. El punto de entrada es `docs/index.html`.

## Dos modos de operación

### Modo local

No requiere backend. Los datos se guardan en IndexedDB dentro del navegador y la aplicación puede funcionar sin conexión después de la primera visita.

Este modo es útil para demostraciones y uso individual. Cada navegador o perfil mantiene una base distinta. Borrar los datos del navegador también borra la instalación local, por lo que se deben descargar respaldos JSON.

### Modo multiusuario con Supabase

GitHub Pages sirve la interfaz, pero Supabase almacena los eventos y evidencias compartidas.

1. Cree un proyecto en Supabase.
2. Abra **SQL Editor** y ejecute `docs/supabase-schema.sql`.
3. Cree las cuentas de los usuarios en Supabase Auth o permita el registro por correo.
4. En la aplicación abra **Configuración → Sincronización**.
5. Seleccione **Multiusuario con Supabase**.
6. Pegue la URL del proyecto y la clave **anon/public**.
7. Inicie sesión y use **Probar conexión**.

Nunca copie la clave `service_role` al navegador ni al repositorio. La aplicación está diseñada para usar únicamente una clave anónima pública, autenticación por correo y políticas RLS.

## Datos que no deben ir a GitHub

No suba al repositorio:

- Facturas, comprobantes o fotografías reales.
- Respaldos JSON exportados por la aplicación.
- Contraseñas.
- Claves `service_role`.
- Archivos `.env` con secretos.

El repositorio contiene solamente código y el esquema de base de datos.

## Funciones incluidas en la versión web

- Registro de ingresos y gastos.
- Evidencias en imagen o PDF.
- Detección por proveedor, número de factura y hash del archivo.
- Advertencias para compras similares sin comprobante.
- Historial reciente y completo.
- Recordatorios periódicos mientras la aplicación está abierta.
- Solicitudes de monto y avisos de transferencia.
- Confirmación o rechazo por el destinatario.
- Libro contable, saldos iniciales, ajustes y reversos.
- Flujo general y conciliación.
- Usuarios, roles y permiso de transferencias.
- Catálogos editables donde cada descripción tiene su propia lista de Proyecto 2.
- Respaldo e importación JSON.
- PWA y caché sin conexión.
- Sincronización periódica opcional con Supabase.

## Límites prácticos

- Las notificaciones horarias no se ejecutan cuando el navegador está completamente cerrado.
- El modo local no comparte datos entre navegadores.
- La sincronización multiusuario necesita Supabase u otro backend equivalente.
- Las políticas incluidas permiten a todos los usuarios autenticados del proyecto acceder a los datos de SKC. Para alojar varias empresas en el mismo proyecto, agregue `tenant_id` y políticas por organización.
- Para información financiera sensible, proteja el repositorio, las cuentas de Supabase y el acceso a la URL publicada.

## Prueba local

Puede revisar el sitio con cualquier servidor estático:

```bash
python -m http.server 8080 --directory docs
```

Después abra `http://localhost:8080`. Abrir `index.html` directamente con `file://` no representa correctamente el comportamiento de módulos, IndexedDB y service workers.
