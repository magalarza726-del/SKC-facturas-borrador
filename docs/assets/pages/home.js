import{store}from'../store.js';
import{money,escapeHtml,dateLabel}from'../utils.js';
import{badge,pageHeader,$all}from'../ui.js';
import{isMobileView}from'../view.js';
import{mobileBalanceCard,mobileIcon}from'../mobile.js';

const cards=[
  ['invoice','▤','Subir factura','Registra un ingreso o gasto con evidencias.','purple'],
  ['messages','✉','Mensajes','Solicitudes, aprobaciones y transferencias.','green'],
  ['history','◷','Historial','Consulta compras, movimientos y saldos.',''],
  ['reminders','●','Recordatorios','Compras pendientes por completar.','orange'],
  ['settings','⚙','Configuración','Catálogos, integraciones y respaldos.','gray'],
  ['manual','?','Manual','Consulta cómo funciona cada módulo.','']
];

function mobileHome(app,navigate){
  const u=store.currentUser(),b=store.balances().filter(x=>x.user.active!==false||Math.abs(x.balance)>0),r=store.reconciliation(),pending=r.transactionsPending+r.messagesPending+r.ledgerPending;
  app.innerHTML=`<div class="mobile-page">${mobileBalanceCard(b,{subtitle:new Intl.DateTimeFormat('es-US',{hour:'numeric',minute:'2-digit'}).format(new Date())})}<section class="mobile-module-grid">${cards.map(([route,icon,title,detail,tone])=>`<button class="mobile-module" type="button" data-go="${route}">${mobileIcon(icon,tone)}<span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(detail)}</small></span><span class="mobile-chevron">›</span></button>`).join('')}</section><button class="mobile-secure" type="button" data-go="settings">${mobileIcon('◆')}<span><strong>Datos seguros y respaldados</strong><small>${store.settings.sync.provider==='supabase'?'Sincronización multiusuario activa.':pending?`${pending} cambios locales pendientes.`:'La información está protegida en este navegador.'}</small></span><span class="mobile-chevron">›</span></button></div>`;
  $all('[data-go]',app).forEach(x=>x.addEventListener('click',()=>navigate(x.dataset.go)));
}

function desktopHome(app,navigate){
  const u=store.currentUser(),b=store.balances().filter(x=>x.user.active!==false||Math.abs(x.user.initialBalance||0)>0),r=store.reconciliation(),p=r.transactionsPending+r.messagesPending+r.ledgerPending,t=store.incomingMessages().filter(x=>x.messageType==='TRANSFERENCIA'&&['ENVIADO','RECIBIDO'].includes(x.status)).length,rm=store.state.reminders.filter(x=>x.userId===u.id&&x.status==='PENDIENTE').length,last=store.recentTransactions(u.id,1)[0];
  app.innerHTML=`${pageHeader('SKC · Facturas','Registro, mensajes y saldos compartidos para compras de proyecto.',`<button class="button button-secondary" data-go="history">Ver historial</button><button class="button" data-go="invoice">Registrar compra</button>`,`Usuario: ${u.name}`)}<section class="grid grid-4"><article class="card kpi"><span class="kpi-label">Registros locales</span><strong class="kpi-value">${store.state.transactions.length}</strong><span class="kpi-detail">${last?`Último: ${dateLabel(last.createdAt,true)}`:'Todavía no hay movimientos'}</span></article><article class="card kpi"><span class="kpi-label">Pendientes de sincronizar</span><strong class="kpi-value">${p}</strong><span class="kpi-detail">Modo: ${store.settings.sync.provider==='supabase'?'Supabase':'Local'}</span></article><article class="card kpi"><span class="kpi-label">Transferencias por confirmar</span><strong class="kpi-value">${t}</strong><span class="kpi-detail">Solo afectan el flujo al confirmarse</span></article><article class="card kpi"><span class="kpi-label">Recordatorios propios</span><strong class="kpi-value">${rm}</strong><span class="kpi-detail">Aviso cada ${store.settings.rules.reminderIntervalMinutes} minutos</span></article></section><section class="grid grid-3" style="margin-top:16px">${cards.filter(x=>x[0]!=='history').map(([route,icon,title,detail])=>`<article class="card dashboard-card"><div class="card-body"><span class="dashboard-icon">${icon}</span><h2>${escapeHtml(title)}</h2><p>${escapeHtml(detail)}</p><button class="button button-secondary" data-go="${route}">Abrir</button></div></article>`).join('')}</section><section class="card flow-card" style="margin-top:20px"><div class="flow-title"><span>SALDOS · flujo actual</span><span class="small">${p?`${p} cambios locales pendientes`:'Conciliación al día'}</span></div><div class="table-wrap"><table class="flow-table"><thead><tr><th>Usuario</th><th class="text-right">Saldo actual</th><th class="text-right">Saldo sincronizado</th><th>Pendientes</th></tr></thead><tbody>${b.length?b.map(({user,balance,syncedBalance,pending})=>`<tr><td>${escapeHtml(user.name)} ${user.active===false?badge('INACTIVO'):''}</td><td class="amount ${balance<0?'negative':'positive'}">${money(balance)}</td><td class="amount ${syncedBalance<0?'negative':'positive'}">${money(syncedBalance)}</td><td>${pending?`${badge('PENDIENTE')} <span class="small muted">${pending}</span>`:badge('SINCRONIZADO')}</td></tr>`).join(''):'<tr><td colspan="4" class="empty-state">No hay usuarios configurados.</td></tr>'}</tbody></table></div></section>`;
  $all('[data-go]',app).forEach(x=>x.addEventListener('click',()=>navigate(x.dataset.go)));
}

export function renderHome(app,navigate){return isMobileView()?mobileHome(app,navigate):desktopHome(app,navigate)}
