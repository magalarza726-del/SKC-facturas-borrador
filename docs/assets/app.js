import {store} from './store.js';
import {sync} from './sync.js';
import {$,$all,toast} from './ui.js';
import {escapeHtml} from './utils.js';
import {applyViewMode,getViewMode,initializeViewMode,toggleViewMode} from './view.js';
import {renderHome} from './pages/home.js';
import {renderInvoice} from './pages/invoice.js';
import {renderMessages} from './pages/messages.js';
import {renderReminders} from './pages/reminders.js';
import {renderFlow} from './pages/flow.js';
import {renderHistory} from './pages/history.js';
import {renderSettings} from './pages/settings.js';
import {renderManual} from './pages/manual.js';
import {graph} from './graph.js';
import {officialExcel} from './excel-official.js';

initializeViewMode();

const routes={home:renderHome,invoice:renderInvoice,messages:renderMessages,reminders:renderReminders,flow:renderFlow,history:renderHistory,settings:renderSettings,manual:renderManual};
const routeTitles={
  home:'SKC Ingeniería · Facturas',invoice:'Subir factura',messages:'Mensajes',reminders:'Recordatorios',flow:'Flujo',history:'Historial',settings:'Configuración',manual:'Manual'
};
const navItems=[
  ['home','⌂','Inicio'],['invoice','🧾','Factura'],['messages','✉','Mensajes'],['reminders','⏰','Recordatorios'],['flow','▦','Flujo'],['history','↺','Historial'],['settings','⚙','Configuración'],['manual','?','Manual']
];
const mobileNavItems=[['home','⌂','Inicio'],['flow','⌁','Flujo'],['messages','◯','Mensajes'],['settings','⚙','Ajustes']];
let activeRoute='home',renderToken=0,reminderTimer=0,clockTimer=0;

function routeFromHash(){const r=location.hash.replace(/^#/,'').split(/[?&/]/)[0].trim();return routes[r]?r:'home'}
export function navigate(route){const next=routes[route]?route:'home';if(location.hash!==`#${next}`)location.hash=next;else renderRoute()}

function navHtml(){return navItems.map(([route,icon,label])=>`<a class="nav-link ${activeRoute===route?'active':''}" href="#${route}" data-nav-route="${route}"><span aria-hidden="true">${icon}</span><span>${escapeHtml(label)}</span></a>`).join('')}
function mobileNavActive(route){return ['invoice','history','reminders','manual'].includes(route)?'home':route}
function mobileNavHtml(){
  const current=mobileNavActive(activeRoute),unread=store.incomingMessages().filter(x=>x.status==='ENVIADO').length;
  return mobileNavItems.map(([route,icon,label])=>`<a class="mobile-bottom-link ${current===route?'active':''}" href="#${route}" aria-label="${escapeHtml(label)}"><span class="mobile-nav-icon" aria-hidden="true">${icon}</span>${route==='messages'&&unread?`<span class="nav-badge">${Math.min(unread,99)}</span>`:''}<span>${escapeHtml(label)}</span></a>`).join('');
}
function userOptions(){const current=store.currentUser().id;return store.users().map(u=>`<option value="${escapeHtml(u.id)}" ${u.id===current?'selected':''}>${escapeHtml(u.name)}</option>`).join('')}
function updateClock(){const x=$('#mobileClock');if(x)x.textContent=new Intl.DateTimeFormat('es-US',{hour:'numeric',minute:'2-digit'}).format(new Date())}
function updateViewControls(){
  const mobile=getViewMode()==='mobile';
  $('#desktopViewButton')?.classList.toggle('active',!mobile);$('#mobileViewButton')?.classList.toggle('active',mobile);
  const toggle=$('#mobileViewToggle');if(toggle){toggle.textContent='▣';toggle.title='Cambiar a modo escritorio';toggle.setAttribute('aria-label','Cambiar a modo escritorio')}
}
function updateChrome(){
  $('#desktopNav').innerHTML=navHtml();
  $('#mobileBottomNav').innerHTML=mobileNavHtml();
  const opts=userOptions(),locked=sync.isUserLocked(),desktopUser=$('#currentUserSelect'),mobileUser=$('#mobileCurrentUserSelect');desktopUser.innerHTML=opts;mobileUser.innerHTML=opts;desktopUser.disabled=locked;mobileUser.disabled=locked;desktopUser.title=locked?'Usuario vinculado al correo de Supabase':'';mobileUser.title=desktopUser.title;
  const mode=store.settings.sync?.provider==='supabase'?'Supabase':'local',last=store.settings.sync?.lastSyncAt;
  $('#footerStatus').textContent=mode==='Supabase'?`Modo Supabase${last?` · última sincronización ${new Date(last).toLocaleString('es-US')}`:''}`:'Datos locales del navegador';
  $('#mobileRecordCount').textContent=`Registros locales: ${store.state.transactions.length}`;
  $('#mobilePageTitle').textContent=routeTitles[activeRoute]||routeTitles.home;
  $('#mobileBackButton').hidden=activeRoute==='home';
  document.title=`${routeTitles[activeRoute]||'SKC Facturas'} · SKC`;
  updateViewControls();updateClock();
}

async function renderRoute(){
  const token=++renderToken;activeRoute=routeFromHash();updateChrome();
  const app=$('#app');app.innerHTML='<section class="loading-panel"><div class="spinner"></div><p>Cargando módulo…</p></section>';
  try{
    if(sync.isConfigured()&&!sync.activeSession)await sync.session().catch(()=>null);
    if(activeRoute!=='settings'&&sync.isUserLocked()&&!sync.hasBoundIdentity()){
      app.innerHTML=`<section class="card"><div class="card-header"><h2>Vincule su identidad antes de operar</h2></div><div class="card-body"><div class="alert alert-warning">La sesión de Supabase está activa, pero su correo no coincide con ningún usuario activo de SKC. Esto evita registrar compras o transferencias con una identidad equivocada.</div><div class="form-actions"><button class="button" id="openIdentitySettings" type="button">Ir a Configuración</button></div></div></section>`;
      $('#openIdentitySettings',app)?.addEventListener('click',()=>navigate('settings'));
      return;
    }
    await routes[activeRoute](app,navigate);
    if(token!==renderToken)return;
    $all('[data-go]',app).forEach(b=>{if(!b.dataset.goBound){b.dataset.goBound='1';b.addEventListener('click',()=>navigate(b.dataset.go))}});
    app.focus({preventScroll:true});window.scrollTo({top:0,behavior:'auto'});
  }catch(e){
    console.error(e);app.innerHTML=`<section class="card"><div class="card-header"><h2>No se pudo abrir este módulo</h2></div><div class="card-body"><div class="alert alert-error">${escapeHtml(e.message||String(e))}</div><div class="form-actions"><button class="button" id="retryRoute" type="button">Reintentar</button></div></div></section>`;$('#retryRoute',app)?.addEventListener('click',renderRoute);
  }
}

async function manualSync(){
  const button=$('#syncButton');
  if(!sync.isConfigured()){toast('La aplicación está en modo local. Configure Supabase para compartir datos.','info');navigate('settings');return}
  button.disabled=true;button.textContent='Sincronizando…';
  try{const r=await sync.syncNow();if(r.errors?.length)toast(`Recibidos: ${r.imported}. Enviados: ${r.sent}. Errores: ${r.errors.length}.`,'info','Sincronización parcial');else toast(`Recibidos: ${r.imported}. Enviados: ${r.sent}.`,'success','Sincronización completa');await renderRoute()}catch(e){toast(e.message,'error','No se pudo sincronizar')}finally{button.disabled=false;button.textContent='Sincronizar'}
}

async function checkReminders(){
  const due=store.dueReminders();
  for(const r of due){
    const text=`Pendiente: ${r.reason}`;toast(text,'info','Recordatorio de compra');
    if('Notification'in window&&Notification.permission==='granted'){
      try{new Notification('SKC Facturas',{body:text,icon:'./icons/icon.svg',tag:`skc-reminder-${r.id}`,renotify:true})}catch{}
    }
    try{await store.touchReminderNotified(r.id)}catch(e){console.warn(e)}
  }
}

async function registerServiceWorker(){
  if(!('serviceWorker'in navigator)||!['https:','http:'].includes(location.protocol))return;
  try{await navigator.serviceWorker.register('./sw.js',{scope:'./'})}catch(e){console.warn('Service worker no disponible:',e)}
}

async function changeUser(id){try{if(sync.isUserLocked()&&id!==sync.boundUserId)throw new Error('La identidad está vinculada al correo de la sesión Supabase.');await store.setCurrentUser(id);await renderRoute()}catch(err){toast(err.message,'error');updateChrome()}}
async function changeView(mode){applyViewMode(mode);await renderRoute()}

async function bootstrap(){
  try{
    await store.initialize();
    try{if(await graph.handleRedirectCallback())toast('Cuenta Microsoft conectada.','success','Microsoft Graph listo')}catch(err){console.warn(err);toast(err.message,'error','No se pudo completar Microsoft Graph')}
    updateChrome();
    $('#currentUserSelect').addEventListener('change',e=>changeUser(e.target.value));
    $('#mobileCurrentUserSelect').addEventListener('change',e=>changeUser(e.target.value));
    $('#syncButton').addEventListener('click',manualSync);
    $('#desktopViewButton').addEventListener('click',()=>changeView('desktop'));
    $('#mobileViewButton').addEventListener('click',()=>changeView('mobile'));
    $('#mobileViewToggle').addEventListener('click',()=>{toggleViewMode();renderRoute()});
    $('#mobileBackButton').addEventListener('click',()=>{if(history.length>1)history.back();else navigate('home')});
    window.addEventListener('hashchange',renderRoute);
    window.addEventListener('online',()=>{if(sync.isConfigured())sync.syncNow().then(renderRoute).catch(()=>{})});
    sync.addEventListener('status',e=>{const detail=e.detail||{},b=$('#syncButton');if(b){b.disabled=Boolean(detail.running);b.textContent=detail.running?'Sincronizando…':'Sincronizar'}if(detail.message)$('#footerStatus').textContent=detail.message;if(detail.completed&&(Number(detail.imported||0)>0||Number(detail.sent||0)>0))officialExcel.autoUpload().catch(err=>console.warn('Excel oficial pendiente:',err))});
    sync.addEventListener('authchange',()=>updateChrome());
    store.addEventListener('settings',()=>{updateChrome();sync.startPolling()});
    sync.startPolling();
    await renderRoute();
    await checkReminders();reminderTimer=setInterval(checkReminders,60000);clockTimer=setInterval(updateClock,30000);
    await registerServiceWorker();
    if(sync.isConfigured()){const session=await sync.session().catch(()=>null);updateChrome();if(session&&navigator.onLine)sync.syncNow().then(renderRoute).catch(e=>console.warn(e))}
  }catch(e){
    console.error(e);$('#app').innerHTML=`<section class="card"><div class="card-header"><h2>No fue posible iniciar SKC Facturas</h2></div><div class="card-body"><div class="alert alert-error">${escapeHtml(e.message||String(e))}</div><p class="muted">Revise que el navegador permita IndexedDB y vuelva a cargar la página.</p></div></section>`;
  }
}

window.addEventListener('beforeunload',()=>{clearInterval(reminderTimer);clearInterval(clockTimer);sync.stopPolling()});
bootstrap();
