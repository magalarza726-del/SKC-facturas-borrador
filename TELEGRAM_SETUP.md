# Lista de lanzamiento del prototipo

## Obligatorio antes de usar facturas reales

- [ ] Reemplazar `Usuario Demo` por usuarios reales.
- [ ] Revisar saldo inicial de cada usuario.
- [ ] Cargar descripciones y Proyecto 2 reales.
- [ ] Revisar qué campos aparecen en **Configuración → Formularios**.
- [ ] Configurar Supabase y ejecutar `docs/supabase-schema.sql`.
- [ ] Crear o invitar cuentas en Supabase; no dejar autorregistro público.
- [ ] Asegurar que el correo de cada cuenta coincida con el usuario de SKC.
- [ ] Mantener activa la vinculación de usuario por correo.
- [ ] Iniciar sesión en cada dispositivo.
- [ ] Probar una compra de $0.01 o un registro marcado claramente como prueba.
- [ ] Confirmar que el movimiento aparece en dos dispositivos.
- [ ] Probar una transferencia y confirmar que solo afecta el saldo al aceptarse.
- [ ] Descargar un respaldo antes de empezar el piloto.

- [ ] Confirmar que participan únicamente usuarios de confianza; los roles de esta versión son controles de la app, no autorización de servidor para producción.

## Microsoft opcional para el primer día

- [ ] Crear App Registration SPA.
- [ ] Configurar Tenant ID y Client ID.
- [ ] Probar subida de evidencia a OneDrive.
- [ ] Probar correo de Outlook.

## Telegram opcional

- [ ] Desplegar la Edge Function incluida.
- [ ] Guardar `TELEGRAM_BOT_TOKEN` como secreto del backend.
- [ ] Configurar URL del proxy y Chat ID.
- [ ] Enviar una prueba desde Integraciones.
