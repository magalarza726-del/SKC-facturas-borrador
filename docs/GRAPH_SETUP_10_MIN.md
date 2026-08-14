# Microsoft Graph en aproximadamente 10 minutos

La versión 2.5.0 incluye el asistente en **Configuración → Integraciones**. Después de crear una App Registration, normalmente basta con pegar `Tenant ID` y `Client ID`, guardar y pulsar **Conectar cuenta**.

## 1. Crear la aplicación en Microsoft Entra

1. Abra Microsoft Entra admin center → **App registrations** → **New registration**.
2. Nombre sugerido: `SKC Facturas Prototipo`.
3. Elija las cuentas permitidas según la política de SKC. Para una sola organización, use el tenant de SKC.
4. En **Authentication**, agregue la plataforma **Single-page application (SPA)**.
5. Copie desde la propia app el valor exacto mostrado como **Redirect URI**. Para el repositorio actual será normalmente `https://magalarza726-del.github.io/SKC-facturas-borrador/`.
6. No cree Client Secret para GitHub Pages ni para una futura APK.

## 2. Permisos delegados mínimos

Para identidad y OneDrive agregue:

- `User.Read`
- `Files.ReadWrite`
- `openid`
- `profile`
- `offline_access`

Agregue `Mail.Send` **solo si activará Outlook** desde la aplicación. La versión 2.5.0 también lo añade automáticamente a la solicitud de autorización cuando Outlook está habilitado.

Dependiendo de la política corporativa, un administrador puede tener que conceder consentimiento.

## 3. Conectar SKC Facturas

1. Abra **Configuración → Integraciones**.
2. Active Microsoft.
3. Pegue `Tenant ID` y `Client ID`.
4. Deje activa la carga de evidencias a OneDrive si la necesita.
5. Active Outlook solo si desea enviar avisos y escriba el correo destinatario.
6. Pulse **Guardar Microsoft**.
7. Pulse **Conectar cuenta** y complete el inicio de sesión.
8. Pulse **Probar conexión y OneDrive**. La app cargará o actualizará `Pruebas/conexion-SKC.txt`.
9. Si activó Outlook, pulse **Enviar correo de prueba**.

## Resultado

- Las evidencias nuevas pueden copiarse a `OneDrive/SKC Facturas/Facturas/...`.
- Las transferencias pueden copiar evidencias a `OneDrive/SKC Facturas/Transferencias/...`.
- Si Outlook está habilitado, puede enviarse un resumen del movimiento.
- Supabase sigue siendo la base transaccional. OneDrive es repositorio documental.
- El Excel oficial puede cargarse a OneDrive únicamente por un administrador, reduciendo sobrescrituras entre dispositivos.

## Diagnóstico rápido

- `AADSTS50011`: el Redirect URI no coincide exactamente.
- Error de permisos: revise permisos delegados y consentimiento.
- No hay sesión: pulse **Conectar cuenta** nuevamente.
- Si el sitio muestra código anterior: quite el service worker o use **Clear site data**.
