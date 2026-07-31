# Base multiusuario Supabase en aproximadamente 10 minutos

La base transaccional de SKC Facturas es Supabase. Microsoft Graph y OneDrive se usan para documentos y correo; no sustituyen el libro de movimientos.

## 1. Crear el proyecto

1. Cree un proyecto nuevo en Supabase.
2. Espere a que la base esté disponible.
3. Abra **SQL Editor**.
4. Copie y ejecute todo el contenido de `docs/supabase-schema.sql`.

El script crea la tabla de eventos, índices, políticas RLS y el bucket privado `skc-evidence`.

## 2. Copiar los dos valores públicos

En **Project Settings → API** copie:

- **Project URL**.
- **anon/public key**.

Nunca use la clave `service_role` en la aplicación, en GitHub ni en el JSON de configuración.

## 3. Conectar SKC Facturas

1. Abra **Configuración → Base compartida**.
2. Seleccione **Multiusuario con Supabase**.
3. Pegue Project URL y anon/public key.
4. Guarde la conexión.
5. Cree o invite las cuentas desde Supabase Auth y use el mismo correo en **Configuración → Usuarios**.
6. Inicie sesión. La opción **Vincular usuario por correo** debe quedar activa.
7. Pulse **Probar conexión** y luego **Sincronizar ahora**.

## 4. Segundo dispositivo

1. Exporte la configuración desde **Configuración → Reglas y respaldo**.
2. Importe el JSON en el segundo dispositivo.
3. Inicie sesión con una cuenta autorizada.
4. Registre un movimiento de prueba de $0.01 claramente identificado como prueba.
5. Sincronice ambos dispositivos y confirme que aparece una sola vez.

## Seguridad del piloto

- Mantenga desactivado el autorregistro desde la app.
- Use únicamente cuentas invitadas o creadas por el administrador.
- La vinculación por correo evita cambios accidentales de identidad en la interfaz.
- Las políticas incluidas son para un único equipo confiable; antes de producción deben reforzarse con roles del servidor.

## Correo de confirmación

Si Supabase exige confirmar el correo, cada usuario debe abrir el enlace recibido antes de iniciar sesión. Para un piloto cerrado puede ajustar temporalmente esa política en Authentication, pero debe revisarla antes de producción.
