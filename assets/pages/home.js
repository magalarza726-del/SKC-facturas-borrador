import{store}from'../store.js';
import{escapeHtml}from'../utils.js';
import{$all}from'../ui.js';
import{mobileBalanceCard,mobileIcon}from'../mobile.js';

// La versión web comparte la misma jerarquía funcional que Android. En escritorio
// ampliamos el lienzo, pero no sustituimos la app por un dashboard diferente.
const modules=[
  ['invoice','▤','Subir factura','Registra un ingreso o gasto con evidencias.','purple'],
  ['messages','✉','Mensajes','Solicitudes, aprobaciones y transferencias.','green'],
  ['history','◷','Historial','Consulta compras, movimientos y saldos.',''],
  ['reminders','●','Recordatorios','Compras pendientes por completar.','orange'],
  ['settings','⚙','Configuración','Usuarios, catálogos, almacenamiento y sincronización.','gray'],
  ['manual','?','Manual','Consulta cómo funciona cada módulo.','']
];

export function renderHome(app,navigate){
  const balances=store.balances().filter(x=>x.user.active!==false||Math.abs(x.balance)>0);
  const reconciliation=store.reconciliation();
  const pending=reconciliation.transactionsPending+reconciliation.messagesPending+reconciliation.ledgerPending;
  const storageProvider=store.settings.storage?.provider||'supabase';
  const syncText=store.settings.sync?.provider==='supabase'
    ?(pending?`${pending} cambios pendientes de sincronizar.`:'Datos sincronizados con SKC.')
    :'Datos guardados en este dispositivo.';

  app.innerHTML=`<div class="mobile-page skc-home-page">
    ${mobileBalanceCard(balances,{subtitle:new Intl.DateTimeFormat('es-US',{hour:'numeric',minute:'2-digit'}).format(new Date())})}
    <section class="mobile-module-grid skc-module-grid">
      ${modules.map(([route,icon,title,detail,tone])=>`<button class="mobile-module" type="button" data-go="${route}">${mobileIcon(icon,tone)}<span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(detail)}</small></span><span class="mobile-chevron">›</span></button>`).join('')}
    </section>
    <button class="mobile-secure" type="button" data-go="settings">${mobileIcon('◆')}<span><strong>Datos seguros y respaldados</strong><small>${escapeHtml(syncText)} · Archivos: ${escapeHtml(String(storageProvider).toUpperCase())}</small></span><span class="mobile-chevron">›</span></button>
  </div>`;
  $all('[data-go]',app).forEach(x=>x.addEventListener('click',()=>navigate(x.dataset.go)));
}
