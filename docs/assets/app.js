import {store} from './store.js';
import {sync} from './sync.js';
import {$,$all,toast} from './ui.js';
import {escapeHtml} from './utils.js';
import {renderHome} from './pages/home.js';
import {renderInvoice} from './pages/invoice.js';
import {renderMessages} from './pages/messages.js';
import {renderReminders} from './pages/reminders.js';
import {renderFlow} from './pages/flow.js';
import {renderHistory} from './pages/history.js';
import {renderSettings} from './pages/settings.js';
import {renderManual} from './pages/manual.js';

const routes={home:renderHome,invoice:renderInvoice,messages:renderMessages,reminders:renderReminders,flow:renderFlow,history:renderHistory,settings:renderSettings,manual:renderManual};
const navItems=[
  ['home','⌂','Inicio'],['invoice','🧾','Factura'],['messages','✉','Mensajes'],['reminders','⏰','Recordatorios'],['flow','▦','Flujo'],['history','↺','Historial'],['settings','⚙','Configuración'],['manual','?','Manual']
];
let activeRoute='home',renderToken=0,reminderTimer=0;

function routeFromHash(){const r=location.hash.replace(/^#/,'').split(/[?&/]/)[0].trim();return routes[r]?r:'home'}
export function navigate(route){const next=routes[route]?route:'home';if(location.hash!==`#${next}`)location.hash=next;else renderRoute()}

function navHtml(){return navItems.map(([route,icon,label])=>`<a class="nav-link ${activeRoute===route?'active':''}" href="#${route}" data-nav-route="${route}"><span aria-hidden="true">${icon}</span><span>${escapeHtml(label)}</span></a>`).join('')}
function updateChrome(){
  $('#desktopNav').innerHTML=navHtml();$('#mobileNav').innerHTML=navHtml();
  const select=$('#currentUserSelect'),users=store.users();select.innerHTML=users.map(u=>`<option value="${escapeHtml(u.id)}" ${u.id===store.currentUser().id?'selected':''}>${escapeHtml(u.name)}</option>`).join('');
  const mode=store.settings.sync?.provider==='supabase'?'Supabase':'local';const last=store.settings.sync?.lastSyncAt;
  $('#footerStatus').textContent=mode==='Supabase'?`Modo Supabase${last?` · última sincronización ${new Date(last).toLocaleString('es-US')}`:''}`:'Datos locales del navegador';
}

async function renderRoute(){
  const token=++renderToken;activeRoute=routeFromHash();updateChrome();
  $('#mobileNav').classList.remove('open');
  const app=$('#app');app.innerHTML='<section class="loading-panel"><div class="spinner"></div><p>Cargando módulo…</p></section>';
  try{
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
  try{const r=await sync.syncNow();toast(`Recibidos: ${r.imported}. Enviados: ${r.sent}.`,'success','Sincronización completa');await renderRoute()}catch(e){toast(e.message,'error','No se pudo sincronizar')}finally{button.disabled=false;button.textContent='Sincronizar'}
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

async function bootstrap(){
  try{
    await store.initialize();
    updateChrome();
    $('#currentUserSelect').addEventListener('change',async e=>{try{await store.setCurrentUser(e.target.value);await renderRoute()}catch(err){toast(err.message,'error');updateChrome()}});
    $('#syncButton').addEventListener('click',manualSync);
    $('#mobileMenuButton').addEventListener('click',()=>$('#mobileNav').classList.toggle('open'));
    document.addEventListener('click',e=>{if(!e.target.closest('.topbar')&&!e.target.closest('#mobileNav'))$('#mobileNav').classList.remove('open')});
    window.addEventListener('hashchange',renderRoute);
    window.addEventListener('online',()=>{if(sync.isConfigured())sync.syncNow().then(renderRoute).catch(()=>{})});
    sync.addEventListener('status',e=>{const b=$('#syncButton');if(!b)return;b.disabled=Boolean(e.detail?.running);b.textContent=e.detail?.running?'Sincronizando…':'Sincronizar';if(e.detail?.message)$('#footerStatus').textContent=e.detail.message});
    sync.addEventListener('authchange',()=>updateChrome());
    store.addEventListener('settings',()=>{updateChrome();sync.startPolling()});
    sync.startPolling();
    await renderRoute();
    await checkReminders();reminderTimer=setInterval(checkReminders,60000);
    await registerServiceWorker();
    if(sync.isConfigured()&&navigator.onLine){const session=await sync.session().catch(()=>null);if(session)sync.syncNow().then(renderRoute).catch(e=>console.warn(e))}
  }catch(e){
    console.error(e);$('#app').innerHTML=`<section class="card"><div class="card-header"><h2>No fue posible iniciar SKC Facturas</h2></div><div class="card-body"><div class="alert alert-error">${escapeHtml(e.message||String(e))}</div><p class="muted">Revise que el navegador permita IndexedDB y vuelva a cargar la página.</p></div></section>`;
  }
}

window.addEventListener('beforeunload',()=>{clearInterval(reminderTimer);sync.stopPolling()});
bootstrap();
