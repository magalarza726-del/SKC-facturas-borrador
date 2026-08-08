# Telegram mediante proxy seguro

GitHub Pages y una futura APK no deben contener el token del bot. La versión 2.4.0 incluye una Supabase Edge Function en `supabase/functions/telegram/index.ts`.

## Preparación

1. Cree el bot con BotFather y conserve `TELEGRAM_BOT_TOKEN` fuera del repositorio.
2. Despliegue la función `telegram` en el mismo proyecto Supabase usado por la app.
3. Configure los secretos:
   - `TELEGRAM_BOT_TOKEN`
   - `ALLOWED_ORIGIN=https://magalarza726-del.github.io`
4. Mantenga la verificación JWT habilitada al desplegar la función.
5. Obtenga el Chat ID del grupo o usuario que recibirá los avisos.

## En SKC Facturas

1. Inicie sesión en Supabase.
2. Abra **Configuración → Integraciones → Telegram**.
3. Escriba la URL de la función, normalmente:
   `https://TU-PROYECTO.supabase.co/functions/v1/telegram`
4. Escriba el Chat ID.
5. Active los eventos deseados y pulse **Enviar prueba**.

La aplicación adjunta el token de sesión Supabase a la solicitud. El token del bot permanece exclusivamente en el backend.
