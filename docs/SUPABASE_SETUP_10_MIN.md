# Supabase en aproximadamente 10 minutos

Supabase es la fuente de datos multiusuario de SKC Facturas. GitHub Pages aloja la interfaz; IndexedDB mantiene una copia local y Supabase comparte eventos y evidencias.

## 1. Crear o abrir el proyecto

1. Cree un proyecto en Supabase.
2. Abra **SQL Editor**.
3. Pegue y ejecute `docs/supabase-schema.sql` completo.
4. Si ya había ejecutado una versión anterior, vuelva a ejecutar el archivo 2.4.0: es idempotente y añade `appConfig`, restricciones de integridad y políticas sin DELETE sin borrar los eventos existentes.

## 2. Obtener los dos datos del navegador

Desde **Connect** o **Project Settings → API Keys**, copie:

- Project URL, con forma `https://xxxxx.supabase.co`
- Publishable key, con forma `sb_publishable_...`

Nunca use `sb_secret_...` ni `service_role` en GitHub Pages. La aplicación 2.4.0 las rechaza explícitamente.

## 3. Configurar la aplicación

En **Configuración → Base compartida**:

1. Seleccione **Multiusuario con Supabase**.
2. Pegue Project URL y Publishable key. Si pega por error `/rest/v1/`, la app normaliza la URL.
3. Mantenga desactivado el autorregistro público para el piloto.
4. Mantenga activado **Vincular usuario por correo**.
5. Guarde, cree/inicie sesión y pulse **Probar conexión**.
6. Pulse **Sincronizar ahora**.

## 4. Identidad

El correo de la cuenta Supabase debe coincidir con el correo de un usuario activo creado en **Configuración → Usuarios**. Si no coincide, 2.4.0 bloquea las operaciones para impedir que una compra quede atribuida al usuario equivocado.

## 5. Configuración compartida

A partir de 2.4.0, los administradores publican por Supabase:

- orden/visibilidad/requerimiento de campos de formularios;
- reglas operativas;
- nombre de grupo.

Los otros dispositivos reciben esos cambios en la siguiente sincronización. Conexiones y credenciales de cada dispositivo permanecen locales.

## Diagnóstico

- `401/403`: revise sesión, Publishable key y políticas RLS.
- `entity_type ... violates check constraint`: vuelva a ejecutar `supabase-schema.sql` 2.4.0.
- Una sesión está conectada pero no puede operar: asigne su correo a un usuario interno activo.
- Evidencia rechazada: formatos permitidos PDF/JPEG/PNG/WEBP/GIF/HEIC/HEIF, máximo 20 MB por archivo.
