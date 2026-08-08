# Lista de lanzamiento del prototipo 2.4.0

## Obligatorio antes de usar facturas reales

- [ ] Publicar `docs/` de la versión 2.4.0 y limpiar el service worker/cache anterior.
- [ ] En el proyecto Supabase existente, volver a ejecutar `docs/supabase-schema.sql` (migración idempotente; no elimina compras).
- [ ] Reemplazar/renombrar `Usuario Demo` y revisar el correo de cada usuario interno.
- [ ] Iniciar sesión en Supabase y confirmar que la sesión queda vinculada al usuario SKC correcto.
- [ ] Mantener autorregistro público desactivado y vinculación por correo activa durante el piloto.
- [ ] Revisar saldo inicial de cada usuario.
- [ ] Cargar descripciones y listas de Proyecto 2 reales; revisar que ninguna descripción necesaria quede sin su Proyecto 2 si ese campo seguirá siendo obligatorio.
- [ ] Revisar Formularios: visibilidad, obligatoriedad, etiquetas, valores por defecto y orden.
- [ ] Probar una compra identificada claramente como prueba en dos navegadores.
- [ ] Adjuntar una evidencia real de prueba y abrirla desde el segundo navegador.
- [ ] Probar un duplicado exacto y comprobar que exige revisión/justificación; probar también una compra sin comprobante similar.
- [ ] Probar una transferencia y confirmar que solo afecta el saldo al aceptarse.
- [ ] Repetir sincronización varias veces y confirmar que saldo y movimientos no se duplican.
- [ ] Descargar y abrir el Excel oficial; verificar columnas A:Q y algunos valores contra el historial.
- [ ] Descargar un respaldo completo antes de comenzar el piloto.
- [ ] Confirmar que participan únicamente usuarios de confianza; los roles de esta versión son controles de la app, no autorización de servidor para producción.

## Microsoft / Excel en OneDrive (opcional el primer día)

- [ ] Crear App Registration tipo SPA y configurar Tenant ID + Client ID.
- [ ] Probar identidad y subida de evidencia a OneDrive.
- [ ] Activar Outlook solo si se usarán correos; `Mail.Send` no es necesario en otro caso.
- [ ] Si se usará actualización automática del Excel, habilitarla **solo en un equipo ADMIN designado** para evitar que varios equipos compitan por el mismo archivo.

## Telegram (opcional)

- [ ] Desplegar la Edge Function incluida.
- [ ] Guardar `TELEGRAM_BOT_TOKEN` como secreto del backend, nunca en GitHub Pages.
- [ ] Configurar URL del proxy y Chat ID.
- [ ] Enviar una prueba desde Integraciones.
