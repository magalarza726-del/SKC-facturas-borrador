# Microsoft Graph en aproximadamente 10 minutos

La aplicación 2.2.0 incluye un asistente en **Configuración → Integraciones**. Después de crear una App Registration, solo necesita pegar `Tenant ID` y `Client ID`, guardar y pulsar **Conectar cuenta**.

## 1. Crear la aplicación en Microsoft Entra

1. Abra Microsoft Entra admin center → **App registrations** → **New registration**.
2. Nombre sugerido: `SKC Facturas Prototipo`.
3. Elija las cuentas permitidas según la política de SKC. Para una sola organización, use el tenant de SKC.
4. En **Authentication**, agregue la plataforma **Single-page application (SPA)**.
5. Copie desde la propia app el valor exacto mostrado como **Redirect URI**. Para el repositorio actual será normalmente:
   `https://magalarza726-del.github.io/SKC-facturas-borrador/`
6. No cree Client Secret para GitHub Pages ni para la futura APK.

## 2. Permisos delegados de Microsoft Graph

Agregue:

- `User.Read`
- `Files.ReadWrite`
- `Mail.Send`
- `openid`
- `profile`
- `offline_access`

Dependiendo de la política corporativa, un administrador puede tener que conceder consentimiento.

## 3. Conectar SKC Facturas

1. Abra **Configuración → Integraciones**.
2. Active Microsoft.
3. Pegue `Tenant ID` y `Client ID`.
4. Deje activa la carga de evidencias a OneDrive.
5. Active Outlook solo si desea enviar avisos y escriba el correo destinatario.
6. Pulse **Guardar Microsoft**.
7. Pulse **Conectar cuenta** y complete el inicio de sesión.
8. Pulse **Probar conexión y OneDrive**. La app cargará o actualizará `Pruebas/conexion-SKC.txt`.
9. Si activó Outlook, pulse **Enviar correo de prueba**.

## Resultado

- Las evidencias nuevas pueden copiarse a `OneDrive/SKC Facturas/Facturas/...`; la app crea automáticamente las carpetas que falten.
- Las transferencias se guardan en `OneDrive/SKC Facturas/Transferencias/...`.
- Si Outlook está habilitado, se envía un resumen del movimiento.
- La base transaccional multiusuario sigue siendo Supabase. OneDrive es repositorio documental, no reemplazo del libro contable.

## Diagnóstico rápido

- `AADSTS50011`: el Redirect URI no coincide exactamente.
- Error de permisos: revise los permisos delegados y consentimiento.
- No hay sesión: vuelva a pulsar **Conectar cuenta**.
- GitHub Pages sigue mostrando una versión anterior: elimine el service worker o use **Clear site data**.
