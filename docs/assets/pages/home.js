import{store}from'../store.js';
import{sync}from'../sync.js';
import{escapeHtml}from'../utils.js';
import{$all}from'../ui.js';
import{mobileBalanceCard,mobileIcon}from'../mobile.js';

function readiness(){const issues=[];if(!store.hasAdmin())issues.push('Asignar al menos un administrador');if(store.settings.sync?.provider!=='supabase')issues.push('Conectar la base multiusuario');else if(!sync.activeSession)issues.push('Iniciar sesión en Supabase');else if(store.settings.sync?.lockUserToEmail!==false&&!sync.boundUserId)issues.push('Vincular el correo con un usuario');if(!(store.catalogs().projects||[]).length)issues.push('Configurar proyectos');return issues}
const baseCards=[
 ['invoice','▤','Subir factura','Registra un ingreso o gasto con evidencias.','purple'],
 ['messages','✉','Mensajes','Solicitudes, aprobaciones y transferencias.','green'],
 ['history','◷','Historial','Consulta compras y evidencias.',''],
 ['reminders','●','Recordatorios','Compras pendientes por completar.','orange'],
 ['flow','⌁','Mi flujo','Consulta tu saldo y movimientos.','']
];
function cards(){return store.canManageAdministration()?[...baseCards,['settings','⚙','Configuración','Usuarios, formularios, almacenamiento e integraciones.','gray']]:baseCards}
function visibleBalances(){return store.visibleBalances().filter(x=>x.user.active!==false||Math.abs(x.balance)>0)}

// Android es la referencia visual y funcional. La web conserva la misma pantalla
// y únicamente aprovecha el ancho disponible mediante CSS responsive.
export function renderHome(app,navigate){
 const balances=visibleBalances(),r=store.reconciliation(),pending=r.transactionsPending+r.messagesPending+r.ledgerPending,issues=readiness(),ready=!issues.length,canSetup=store.canManageAdministration();
 const storage=String(store.settings.storage?.provider||'supabase').toUpperCase();
 const secure=sync.isConfigured()&&sync.activeSession&&sync.hasBoundIdentity()?`Datos sincronizados · Archivos ${storage}`:pending?`${pending} cambios locales pendientes · Archivos ${storage}`:`Datos protegidos · Archivos ${storage}`;
 app.innerHTML=`<div class="mobile-page skc-home-page">${ready?'':`<div class="mobile-alert"><span class="alert-icon">!</span><span><strong>Preparación pendiente</strong>${escapeHtml(issues.join(' · '))}</span>${canSetup?'<button class="button button-compact" type="button" data-go="settings">Configurar</button>':'<span></span>'}</div>`}${mobileBalanceCard(balances,{subtitle:new Intl.DateTimeFormat('es-US',{hour:'numeric',minute:'2-digit'}).format(new Date()),group:store.isAdmin()?'EN VIVO':'MI SALDO'})}<section class="mobile-module-grid skc-module-grid">${cards().map(([route,icon,title,detail,tone])=>`<button class="mobile-module" type="button" data-go="${route}">${mobileIcon(icon,tone)}<span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(detail)}</small></span><span class="mobile-chevron">›</span></button>`).join('')}</section><div class="mobile-secure"><span class="mobile-icon-box">◆</span><span><strong>Datos y evidencias protegidos</strong><small>${escapeHtml(secure)}</small></span><span></span></div></div>`;
 $all('[data-go]',app).forEach(x=>x.addEventListener('click',()=>navigate(x.dataset.go)));
}
