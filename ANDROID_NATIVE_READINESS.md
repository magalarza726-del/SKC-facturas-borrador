# Preparación para Android nativo

La versión 2.5.0 separa configuración, formularios e integraciones de la interfaz. Esto permite reutilizar el mismo contrato JSON en una futura APK.

## Contratos reutilizables

- `docs/app-config.schema.json`: esquema de configuración portable.
- `docs/assets/form-config.js`: catálogo de campos, visibilidad, obligatoriedad, valores por defecto y orden.
- `docs/assets/graph.js`: contrato OAuth/Graph para OneDrive y Outlook.
- `docs/assets/integrations.js`: eventos de negocio posteriores al guardado.
- `supabase/functions/telegram/index.ts`: proxy seguro para Telegram.

## En Android

- Tenant ID y Client ID pueden importarse desde JSON porque no son secretos.
- Tokens OAuth deben guardarse en Android Keystore/EncryptedSharedPreferences.
- El token de Telegram debe permanecer en un backend o Edge Function, no dentro del APK.
- La base multiusuario puede continuar en Supabase o migrarse a una API propia sin cambiar el formato de los formularios.
- El APK debe implementar el mismo `schemaVersion: 1` al importar/exportar configuración.

## Lo que no debe exportarse

- Tokens de sesión.
- Client secrets.
- Service-role keys.
- Token del bot de Telegram.
- Facturas o evidencias dentro del archivo de configuración. Esos datos pertenecen al respaldo operativo, no a la configuración.
