# Historial de cambios

## 2.0.0 — GitHub Pages

- Se creó una versión web estática independiente, publicable directamente desde `docs/`.
- Se reemplazó SQLite por IndexedDB para el modo local del navegador.
- Se migraron compras, duplicados, historial, recordatorios, Mensajes, transferencias, flujo, conciliación, usuarios y catálogos.
- Se añadió una PWA con service worker y funcionamiento sin conexión.
- Se incorporó sincronización multiusuario opcional con Supabase, autenticación, RLS y almacenamiento privado de evidencias.
- Se agregó `supabase-schema.sql`, una guía de publicación y un workflow de GitHub Actions.
- Se mantuvo intacta la aplicación de escritorio como variante separada.

## 1.5.0

- Se añadió detección de duplicados por factura, proveedor y hash de evidencias, con alerta para compras similares sin comprobante.
- Se incorporó historial reciente dentro del formulario y separación entre quien registra y la persona cuyo saldo se afecta.
- Se añadieron recordatorios horarios trazables, Mensajes, avisos de transferencia, bandeja de entrada y evidencias.
- Se implementó un libro de movimientos para saldos iniciales, ingresos, egresos, ajustes y reversos.
- La pantalla principal muestra el flujo por usuario y un apartado de conciliación.
- Se incorporó sincronización bidireccional por carpeta compartida o Microsoft Graph.
- Se corrigió un conflicto crítico: una copia remota antigua ya no puede marcar como sincronizada una modificación local más reciente.
- Las transferencias confirmadas no pueden rechazarse sin un reverso contable.
- Se verificó el flujo completo con dos instalaciones simuladas y ciclos repetidos sin duplicar movimientos.
- La batería automatizada aumentó a 21 pruebas.

## 1.4.0

- Cada Descripción administra ahora su propia lista de opciones de Proyecto 2.
- Se añadieron acciones para agregar, renombrar y quitar Proyecto 2 dentro de cada descripción.
- La pantalla Subir factura muestra primero una lista de Descripción y luego filtra Proyecto 2 según la selección.
- Las relaciones creadas en la versión 1.3 se agrupan automáticamente por descripción sin perder proyectos.
- Solicitar monto conserva una lista consolidada y sin duplicados de todos los Proyecto 2.
- No se modificó la base histórica ni el esquema de movimientos guardados.
- Se ampliaron las pruebas de migración y normalización de catálogos.

## 1.3.0

- Los catálogos de proyectos se simplificaron a Descripción y Proyecto 2.
- Centros de costos y costos secundarios pasaron a listas generales.
- Se incorporó migración automática desde estructuras anteriores.
- El manual predeterminado se enfocó en OneDrive, Outlook y Microsoft Graph.

## 1.1.0

- Se eliminó el editor JSON visible de Configuración.
- Se añadió un administrador visual de proyectos con búsqueda, creación, duplicado, edición y eliminación.
- Cada proyecto permite definir cliente, centro de costos y costos secundarios permitidos.
- Se añadieron editores visuales para centros de costos, costos secundarios, estados del comprobante y formas de pago.
- Los catálogos se normalizan antes de guardarse para evitar duplicados y pérdida de categorías utilizadas.
- La pestaña Integraciones ahora es desplazable y muestra solamente los campos del proveedor seleccionado.
- Se reorganizaron las opciones de correo en paneles separados para sistema, SMTP, Microsoft Graph y modo deshabilitado.
- Se renovó la apariencia con un estilo inspirado en Microsoft Office/Fluent, sin logotipo gráfico.
- Se agregaron pruebas para normalización y validación de catálogos.

## 1.2.0

- Se añadió una pestaña Manual dentro de Configuración.
- El manual ahora se edita mediante un editor visual enriquecido, sin escribir HTML.
- El editor permite títulos, negrita, cursiva, subrayado, listas y vínculos.
- Se añadió vista previa y restauración del contenido predeterminado.
- El contenido personalizado se guarda en la configuración local y se refleja al abrir Manual.
- Los archivos de configuración antiguos reciben automáticamente el manual predeterminado.
