import {store} from '../store.js';
import {normalizeSupabaseUrl,sync} from '../sync.js';
import {dateLabel,downloadBlob,escapeHtml,money,nowIso,parseLines,uuid} from '../utils.js';
import {$,$all,badge,confirmDialog,optionsHtml,pageHeader,showModal,toast} from '../ui.js';
import {isMobileView} from '../view.js';
import {mobileIcon} from '../mobile.js';
import {FORM_SCHEMAS,defaultFormLayouts,getFormLayout} from '../form-config.js';
import {graph,normalizeGraphScopes} from '../graph.js';
import {integrations} from '../integrations.js';
import {officialExcel} from '../excel-official.js';

let tab=sessionStorage.getItem('skc-settings-tab')||'setup',mobileSection='home',formModule='invoice';
const setTab=value=>{tab=value;sessionStorage.setItem('skc-settings-tab',value)};

function userRows(){
  const rows=store.users(true);
  return rows.length?rows.map(u=>`<tr>
    <td><strong>${escapeHtml(u.name)}</strong><br><span class="small muted">${escapeHtml(u.email||'Sin correo')}</span></td>
    <td>${badge(u.role)}</td>
    <td>${badge(u.transferEnabled?'HABILITADO':'BLOQUEADO')}</td>
    <td>${money(u.initialBalance||0)}</td>
    <td>${badge(u.active===false?'INACTIVO':'ACTIVO')}</td>
    <td>${store.canManageAdministration()?`<button type="button" class="button button-secondary button-compact" data-edit-user="${u.id}">Editar</button>`:'—'}</td>
  </tr>`).join(''):'<tr><td colspan="6" class="empty-state">No hay usuarios.</td></tr>';
}

async function editUser(user=null){
  if(!store.canManageAdministration())throw new Error('Solo un administrador puede modificar usuarios.');
  const u=user||{name:'',email:'',role:'USUARIO',transferEnabled:false,initialBalance:0,active:true};
  return showModal({
    title:user?'Editar usuario':'Agregar usuario',
    width:'650px',
    body:`<form id="userEditor" class="form-grid">
      <div class="field span-6"><label class="required">Nombre</label><input name="name" value="${escapeHtml(u.name)}" minlength="2" required></div>
      <div class="field span-6"><label>Correo</label><input name="email" type="email" value="${escapeHtml(u.email||'')}"></div>
      <div class="field span-4"><label>Rol</label><select name="role">${optionsHtml([{id:'USUARIO',name:'Usuario'},{id:'ADMIN',name:'Administrador'}],u.role)}</select></div>
      <div class="field span-4"><label>Saldo inicial USD</label><input name="initialBalance" type="number" step=".01" value="${Number(u.initialBalance||0)}"></div>
      <div class="field span-4"><span>Permisos y estado</span><div class="stack small"><label><input name="transferEnabled" type="checkbox" ${u.transferEnabled?'checked':''}> Puede avisar transferencias</label><label><input name="active" type="checkbox" ${u.active!==false?'checked':''}> Usuario activo</label></div></div>
    </form>`,
    submitLabel:'Guardar usuario',
    onSubmit:async modal=>{
      const f=modal.querySelector('#userEditor'),d=Object.fromEntries(new FormData(f));
      await store.saveUser({id:user?.id,name:d.name,email:d.email,role:d.role,initialBalance:d.initialBalance,transferEnabled:f.elements.transferEnabled.checked,active:f.elements.active.checked});
      return true;
    }
  });
}


function renderSetup(session){
  const realUsers=store.users(true).length,cat=store.catalogs(),syncReady=store.settings.sync?.provider==='supabase'&&store.settings.sync?.supabaseUrl&&store.settings.sync?.anonKey,identityReady=store.settings.sync?.lockUserToEmail===false||sync.hasBoundIdentity(),graphReady=graph.isConfigured()&&graph.isConnected(),adminReady=store.hasAdmin();
  const steps=[
    ['users','Usuarios y administrador',realUsers>0&&adminReady,realUsers?`${realUsers} usuario(s) · ${adminReady?'administrador asignado':'falta asignar administrador'}`:'Configure los usuarios reales.'],
    ['catalogs','Proyectos y catálogos',(cat.projects||[]).length>0,`${(cat.projects||[]).length} descripción(es) disponible(s)`],
    ['forms','Formulario simple',Array.isArray(store.settings.forms?.invoice),'Decida qué campos verá el personal en el piloto.'],
    ['sync','Base multiusuario',Boolean(syncReady&&session&&identityReady),syncReady?(session?(identityReady?'Supabase conectado e identidad vinculada':'El correo de Supabase no coincide con un usuario activo'):'Falta iniciar sesión en Supabase'):'Faltan URL, anon key y esquema SQL.'],
    ['integrations','Evidencias privadas',Boolean(syncReady&&session),syncReady&&session?'Supabase Storage guarda fotos y PDFs en skc-evidence.':'Se habilita al conectar Supabase.'],
    ['integrations','Microsoft Graph',graphReady,graph.isConfigured()?(graph.isConnected()?'Cuenta Microsoft conectada':'Falta conectar la cuenta'):'Opcional; no es necesario para evidencias.'],
    ['rules','Respaldo inicial',Boolean(store.settings.pilot?.lastBackupAt),store.settings.pilot?.lastBackupAt?`Último respaldo: ${dateLabel(store.settings.pilot.lastBackupAt,true)}`:'Descargue un respaldo antes de comenzar las pruebas reales.']
  ];
  const requiredReady=steps.slice(0,5).every(x=>x[2]);
  return `<section class="stack"><div class="alert ${requiredReady?'alert-success':'alert-warning'}"><strong>${requiredReady?'La configuración mínima está lista para el piloto.':'Complete los pasos obligatorios antes de usar facturas reales.'}</strong><br><span class="small">Las evidencias se guardan en Supabase. Microsoft y Telegram son opcionales.</span></div><section class="grid grid-2">${steps.map(([target,title,ok,detail],i)=>`<article class="card"><div class="card-header"><div><h2>${i+1}. ${escapeHtml(title)}</h2><span class="small muted">${escapeHtml(detail)}</span></div>${badge(ok?'LISTO':target==='integrations'?'OPCIONAL':'PENDIENTE')}</div><div class="card-body"><button class="button ${ok?'button-secondary':''}" type="button" data-open-settings="${target}">${ok?'Revisar':'Configurar'}</button></div></article>`).join('')}</section><div class="form-actions" style="justify-content:flex-start"><a class="button button-secondary" href="./LAUNCH_CHECKLIST.md" target="_blank" rel="noopener">Ver lista de lanzamiento</a><a class="button button-secondary" href="./GRAPH_SETUP_10_MIN.md" target="_blank" rel="noopener">Guía Microsoft Graph</a><a class="button button-secondary" href="./SUPABASE_SETUP_10_MIN.md" target="_blank" rel="noopener">Guía base real</a></div></section>`;
}

function renderUsers(){
  return `<section class="card">
    <div class="card-header"><div><h2>Usuarios y permisos</h2><span class="small muted">El responsable del saldo puede ser distinto de quien rellena el formulario.</span></div>${store.canManageAdministration()?'<button type="button" class="button" id="addUser">Agregar usuario</button>':''}</div>
    <div class="table-wrap"><table><thead><tr><th>Usuario</th><th>Rol</th><th>Transferencias</th><th>Saldo inicial</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${userRows()}</tbody></table></div>
  </section>${!store.canManageAdministration()?'<div class="alert alert-warning" style="margin-top:14px">Inicie como administrador para modificar usuarios, permisos y saldos iniciales.</div>':''}`;
}

function projectGroupsHtml(){
  const c=store.catalogs();
  return c.projects.map(p=>`<div class="catalog-group" data-project-group data-id="${escapeHtml(p.id)}">
    <div class="row space-between"><strong>Descripción y sus Proyectos 2</strong><button type="button" class="button button-danger button-compact" data-remove-project-group>Eliminar</button></div>
    <div class="form-grid" style="margin-top:12px">
      <div class="field span-5"><label class="required">Descripción base</label><input data-project-description value="${escapeHtml(p.description)}"></div>
      <div class="field span-7"><label class="required">Lista de Proyecto 2</label><textarea data-project-options placeholder="Un proyecto por línea">${escapeHtml((p.project2Options||[]).join('\n'))}</textarea></div>
    </div>
  </div>`).join('');
}

function renderCatalogs(){
  const c=store.catalogs();
  if(!store.canManageAdministration())return '<div class="alert alert-warning">Solo un administrador puede editar catálogos.</div>';
  return `<form id="catalogForm" class="stack">
    <section class="card"><div class="card-header"><div><h2>Descripciones y Proyecto 2</h2><span class="small muted">Cada descripción mantiene su propia lista desplegable.</span></div><button type="button" class="button button-secondary" id="addProjectGroup">Agregar descripción</button></div><div class="card-body" id="projectGroups">${projectGroupsHtml()||'<div class="empty-state" id="projectEmpty">Agregue la primera descripción.</div>'}</div></section>
    <section class="card"><div class="card-header"><h2>Catálogos generales</h2></div><div class="card-body"><div class="form-grid">
      <div class="field span-6"><label>Centros de costo</label><textarea name="costCenters" placeholder="Uno por línea">${escapeHtml((c.costCenters||[]).join('\n'))}</textarea></div>
      <div class="field span-6"><label>Costos secundarios</label><textarea name="secondaryCosts" placeholder="Uno por línea">${escapeHtml((c.secondaryCosts||[]).join('\n'))}</textarea></div>
      <div class="field span-6"><label>Estados de evidencia</label><textarea name="evidenceStatuses" placeholder="Uno por línea">${escapeHtml((c.evidenceStatuses||[]).join('\n'))}</textarea></div>
      <div class="field span-6"><label>Métodos de pago</label><textarea name="paymentMethods" placeholder="Uno por línea">${escapeHtml((c.paymentMethods||[]).join('\n'))}</textarea></div>
    </div><div class="form-actions"><button class="button" type="submit">Guardar catálogos</button></div></div></section>
  </form>`;
}

function renderSync(session){
  const s=store.settings.sync||{},provider=s.provider||'local',configured=provider==='supabase'&&s.supabaseUrl&&s.anonKey;
  return `<section class="grid grid-2">
    <article class="card"><div class="card-header"><div><h2>Fuente de datos</h2><span class="small muted">GitHub Pages aloja la interfaz; los datos permanecen locales o se comparten por Supabase.</span></div>${badge(provider==='supabase'?'SUPABASE':'LOCAL')}</div><div class="card-body">
      <form id="syncConfigForm"><div class="form-grid">
        <div class="field"><label>Modo</label><select name="provider"><option value="local" ${provider==='local'?'selected':''}>Solo este navegador (IndexedDB)</option><option value="supabase" ${provider==='supabase'?'selected':''}>Multiusuario con Supabase</option></select></div>
        <div class="field"><label>URL del proyecto Supabase</label><input name="supabaseUrl" type="url" value="${escapeHtml(s.supabaseUrl||'')}" placeholder="https://xxxx.supabase.co"></div>
        <div class="field"><label>Clave anónima pública</label><textarea name="anonKey" rows="3" placeholder="Use únicamente la anon/public key; nunca una service_role key.">${escapeHtml(s.anonKey||'')}</textarea></div>
        <div class="field span-4"><label>Consulta de cambios cada</label><div class="row"><input name="pollSeconds" type="number" min="10" max="3600" value="${Math.max(10,Number(s.pollSeconds||20))}"><span class="muted">segundos</span></div></div>
        <div class="field span-4"><label><input name="lockUserToEmail" type="checkbox" ${s.lockUserToEmail!==false?'checked':''}> Vincular usuario por correo al iniciar sesión</label><span class="field-hint">Evita que un usuario autenticado cambie de identidad desde el selector.</span></div>
        <div class="field span-4"><label><input name="allowSelfSignUp" type="checkbox" ${s.allowSelfSignUp?'checked':''}> Permitir crear cuentas desde la app</label><span class="field-hint">Déjelo desactivado para el piloto real y cree o invite las cuentas desde Supabase.</span></div>
      </div><div class="form-actions"><a class="button button-secondary" href="./supabase-schema.sql" download>Descargar esquema SQL</a><a class="button button-ghost" href="./SUPABASE_SETUP_10_MIN.md" target="_blank" rel="noopener">Guía de 10 minutos</a><button class="button" type="submit">Guardar conexión</button></div></form>
      ${provider==='local'?'<div class="alert" style="margin-top:14px">Modo local: funciona sin servidor, incluso sin conexión después de la primera carga. Cada navegador conserva su propia base.</div>':configured?'<div class="alert alert-success" style="margin-top:14px">Configuración de Supabase completa. Falta iniciar sesión o probar la conexión.</div>':'<div class="alert alert-warning" style="margin-top:14px">Complete URL y clave anónima para activar el modo compartido.</div>'}
    </div></article>
    <article class="card"><div class="card-header"><div><h2>Sesión y sincronización</h2><span class="small muted">Los cambios se publican como eventos idempotentes.</span></div>${badge(session?'CONECTADO':'SIN SESIÓN')}</div><div class="card-body">
      ${session?`<div class="stack"><div class="alert ${s.lockUserToEmail!==false&&!sync.hasBoundIdentity()?'alert-warning':'alert-success'}"><strong>Sesión activa</strong><br>${escapeHtml(session.user?.email||'Usuario autenticado')}${s.lockUserToEmail!==false&&!sync.hasBoundIdentity()?'<br><span class="small">No existe un usuario activo con este mismo correo. Las operaciones quedan bloqueadas hasta vincularlo en Configuración → Usuarios.</span>':sync.hasBoundIdentity()?'<br><span class="small">Identidad vinculada al usuario de la aplicación.</span>':''}</div><div><strong>Última sincronización:</strong> ${dateLabel(s.lastSyncAt,true)}</div><div class="form-actions"><button type="button" class="button button-secondary" id="testSync">Probar conexión</button><button type="button" class="button" id="syncNowSettings">Sincronizar ahora</button><button type="button" class="button button-danger" id="logoutSync">Cerrar sesión</button></div></div>`:`<form id="authForm"><div class="form-grid"><div class="field"><label>Correo</label><input name="email" type="email" autocomplete="username" required></div><div class="field"><label>Contraseña</label><input name="password" type="password" minlength="6" autocomplete="current-password" required></div></div><div class="form-actions">${s.allowSelfSignUp?'<button type="button" class="button button-secondary" id="signUpSync">Crear cuenta</button>':''}<button class="button" type="submit">Iniciar sesión</button></div>${s.allowSelfSignUp?'':'<div class="alert" style="margin-top:12px">El autorregistro está desactivado. Cree o invite la cuenta desde Supabase Auth.</div>'}</form>`}
      <hr><div class="small muted">La evidencia se guarda en el bucket privado <span class="mono">skc-evidence</span>. El navegador nunca necesita una clave administrativa.</div>
    </div></article>
  </section>`;
}


function renderForms(){
  if(!store.canManageAdministration())return '<div class="alert alert-warning">Solo un administrador puede cambiar la estructura de los formularios.</div>';
  const layout=getFormLayout(store.settings,formModule),schema=FORM_SCHEMAS[formModule],mobile=isMobileView();
  const controls=f=>`<input type="hidden" name="fieldId" value="${escapeHtml(f.id)}"><input type="hidden" name="fieldOrder" value="${f.order}"><div class="row"><button class="button button-ghost button-compact" type="button" data-field-up aria-label="Subir">↑</button><button class="button button-ghost button-compact" type="button" data-field-down aria-label="Bajar">↓</button></div>`;
  const rows=layout.map((f,index)=>mobile?`<article class="mobile-config-field" data-form-field="${escapeHtml(f.id)}">
    <div class="mobile-config-head"><span><strong>${escapeHtml(f.label)}</strong><small class="mono">${escapeHtml(f.id)}</small></span>${f.core?badge('ESENCIAL'):''}${controls({...f,order:index})}</div>
    <div class="mobile-field"><label>Nombre visible</label><input name="fieldLabel" value="${escapeHtml(f.label)}"></div>
    <div class="mobile-config-options"><label><input name="fieldVisible" type="checkbox" ${f.visible?'checked':''} ${f.core?'disabled':''}> Mostrar</label><label><input name="fieldRequired" type="checkbox" ${f.required?'checked':''} ${f.core&&f.required?'disabled':''}> Obligatorio</label></div>
    <div class="mobile-field"><label>Valor por defecto</label><input name="fieldDefault" value="${escapeHtml(f.defaultValue||'')}" placeholder="Vacío o valor automático"></div>
  </article>`:`<tr data-form-field="${escapeHtml(f.id)}">
    <td>${controls({...f,order:index})}</td>
    <td><input name="fieldLabel" value="${escapeHtml(f.label)}"><br><span class="small muted mono">${escapeHtml(f.id)}</span> ${f.core?badge('ESENCIAL'):''}</td>
    <td><label><input name="fieldVisible" type="checkbox" ${f.visible?'checked':''} ${f.core?'disabled':''}> Mostrar</label></td>
    <td><label><input name="fieldRequired" type="checkbox" ${f.required?'checked':''} ${f.core&&f.required?'disabled':''}> Obligatorio</label></td>
    <td><input name="fieldDefault" value="${escapeHtml(f.defaultValue||'')}" placeholder="Vacío o valor automático"></td>
  </tr>`).join('');
  const editor=mobile?`<div id="formLayoutRows" class="mobile-config-list">${rows}</div>`:`<div class="table-wrap"><table><thead><tr><th>Orden</th><th>Campo</th><th>Visibilidad</th><th>Validación</th><th>Valor por defecto</th></tr></thead><tbody id="formLayoutRows">${rows}</tbody></table></div>`;
  return `<section class="card"><div class="card-header"><div><h2>Diseñador de formularios</h2><span class="small muted">Muestra, oculta, renombra y reorganiza campos sin modificar el código. Los campos esenciales permanecen activos.</span></div>${badge('CONFIGURABLE')}</div><div class="card-body">
    <div class="form-grid"><div class="field span-4"><label>Formulario</label><select id="formModuleSelect">${Object.entries(FORM_SCHEMAS).map(([id,x])=>`<option value="${id}" ${id===formModule?'selected':''}>${escapeHtml(x.label)}</option>`).join('')}</select></div><div class="field span-8"><label>Valores automáticos disponibles</label><div class="small muted mono">@today · @currentUser · @firstProject · @firstProject2 · @projectDescription · @normalEvidence · @firstCostCenter · @firstSecondaryCost · @firstPaymentMethod · @currentBalance</div></div></div>
    <form id="formLayoutForm">${editor}<div class="form-actions"><button class="button button-ghost" id="simpleFormPreset" type="button">Vista simple</button><button class="button button-secondary" id="completeFormPreset" type="button">Mostrar todo</button><button class="button" type="submit">Guardar estructura</button></div></form>
    <div class="alert" style="margin-top:14px"><strong>Configuración compartida:</strong> los cambios de estructura realizados por un administrador se publican por Supabase y llegan a los demás dispositivos en la siguiente sincronización. Los campos ocultos conservan sus valores automáticos y pueden reactivarse desde aquí.</div>
  </div></section>`;
}

function renderIntegrations(){
  const m=store.settings.integrations?.microsoft||{},t=store.settings.integrations?.telegram||{},x=store.settings.integrations?.excel||{},gc=graph.config(),connected=graph.isConnected(),excelAdmin=store.canManageAdministration();
  return `<section class="stack">
    <article class="card"><div class="card-header"><div><h2>Evidencias · Supabase Storage</h2><span class="small muted">Almacenamiento principal de fotos, PDFs y comprobantes. Administración los consulta desde Historial sin entrar a Supabase.</span></div>${badge(sync.isConfigured()?'HABILITADO':'PENDIENTE')}</div><div class="card-body"><div class="grid grid-3"><div><strong>Bucket privado</strong><br><span class="mono">skc-evidence</span></div><div><strong>Organización</strong><br><span class="small">facturas/año/mes/día/código</span></div><div><strong>Acceso</strong><br><span class="small">Solo mediante sesión autenticada de SKC Facturas</span></div></div><div class="alert alert-success" style="margin-top:14px"><strong>Modo recomendado:</strong> Supabase es la fuente principal de datos y evidencias. Microsoft Graph queda como respaldo o integración opcional.</div></div></article>
    <article class="card"><div class="card-header"><div><h2>Microsoft Graph · opcional</h2><span class="small muted">Conecta OneDrive y Outlook si SKC decide usarlos más adelante. Las evidencias ya funcionan sin Microsoft.</span></div>${badge(connected?'CONECTADO':gc.clientId?'LISTO PARA CONECTAR':'PENDIENTE')}</div><div class="card-body">
      <form id="microsoftIntegrationForm"><div class="form-grid">
        <div class="field span-3"><label><input name="enabled" type="checkbox" ${m.enabled?'checked':''}> Activar Microsoft</label></div>
        <div class="field span-4"><label>Tenant ID</label><input name="tenantId" value="${escapeHtml(m.tenantId||'common')}" placeholder="common o GUID del tenant"></div>
        <div class="field span-5"><label>Client ID de la aplicación</label><input name="clientId" value="${escapeHtml(m.clientId||'')}" placeholder="00000000-0000-0000-0000-000000000000"></div>
        <div class="field span-12"><label>Redirect URI que debe registrar en Microsoft Entra</label><input name="redirectUri" value="${escapeHtml(gc.redirectUri)}" readonly><span class="field-hint">Copie exactamente esta dirección como plataforma <strong>Single-page application</strong>.</span></div>
        <div class="field span-6"><label>Carpeta raíz de OneDrive</label><input name="driveFolder" value="${escapeHtml(m.driveFolder||'SKC Facturas')}"></div>
        <div class="field span-6"><label>Permisos delegados</label><textarea name="scopes" rows="3">${escapeHtml(gc.scopes.join('\n'))}</textarea></div>
        <div class="field span-4"><label><input name="uploadEvidence" type="checkbox" ${m.uploadEvidence!==false?'checked':''}> Subir evidencias a OneDrive</label></div>
        <div class="field span-4"><label><input name="sendOutlook" type="checkbox" ${m.sendOutlook?'checked':''}> Enviar avisos por Outlook</label></div>
        <div class="field span-4"><label>Correo para avisos</label><input name="notifyEmail" type="email" value="${escapeHtml(m.notifyEmail||'')}" placeholder="finanzas@empresa.com"></div>
      </div><div class="form-actions"><button class="button" type="submit">Guardar Microsoft</button><button class="button button-secondary" id="connectMicrosoft" type="button">${connected?'Reconectar cuenta':'Conectar cuenta'}</button><button class="button button-secondary" id="testMicrosoft" type="button">Probar conexión y OneDrive</button>${connected&&m.sendOutlook&&m.notifyEmail?'<button class="button button-secondary" id="testOutlook" type="button">Enviar correo de prueba</button>':''}${connected?'<button class="button button-danger" id="disconnectMicrosoft" type="button">Desconectar</button>':''}<button class="button button-ghost" id="copyRedirectUri" type="button">Copiar Redirect URI</button><button class="button button-ghost" id="downloadGraphTemplate" type="button">Descargar plantilla Entra</button></div></form>
      <div class="alert alert-warning" style="margin-top:14px"><strong>Limitación real:</strong> la app puede completar el inicio de sesión automáticamente después de crear la App Registration, pero un navegador no puede crearla por sí mismo sin permisos administrativos del tenant.</div>
    </div></article>
    <article class="card"><div class="card-header"><div><h2>Excel oficial SKC</h2><span class="small muted">Genera el registro administrativo con FECHA, semana/mes, DESCRIPCIÓN, PROYECTO2, centros de costo, Cliente, Factura, INGRESO, EGRESO, responsable y observaciones.</span></div>${badge(x.enabled===false?'DESHABILITADO':'HABILITADO')}</div><div class="card-body"><form id="excelIntegrationForm"><div class="form-grid">
      <div class="field span-3"><label><input name="enabled" type="checkbox" ${x.enabled!==false?'checked':''}> Habilitar Excel oficial</label></div>
      <div class="field span-5"><label>Nombre del archivo</label><input name="filename" value="${escapeHtml(x.filename||'SKC_Registro_Oficial.xlsx')}"></div>
      <div class="field span-4"><label>Nombre de hoja</label><input name="sheetName" value="${escapeHtml(x.sheetName||'REGISTRO')}"></div>
      <div class="field span-4"><label><input name="onlySynced" type="checkbox" ${x.onlySynced?'checked':''}> Solo compras sincronizadas</label></div>
      <div class="field span-4"><label>Carpeta OneDrive (opcional)</label><input name="oneDriveFolder" value="${escapeHtml(x.oneDriveFolder||'Excel oficial')}"></div>
      <div class="field span-4"><label><input name="autoUpload" type="checkbox" ${x.autoUpload?'checked':''} ${excelAdmin?'':'disabled'}> Actualizar en OneDrive tras sincronizar</label><span class="field-hint">Solo se usa si Microsoft Graph está conectado. El Excel siempre puede descargarse directamente desde la app.</span></div>
    </div><div class="form-actions"><button class="button" type="submit">Guardar Excel</button><button class="button button-secondary" id="downloadOfficialExcel" type="button">Descargar Excel oficial</button><button class="button button-secondary" id="uploadOfficialExcel" type="button" ${excelAdmin?'':'disabled'}>Subir a OneDrive</button></div></form><div class="alert" style="margin-top:14px"><strong>Fuente de verdad:</strong> Supabase continúa siendo la base principal. El Excel oficial es una salida administrativa; las evidencias se consultan desde Historial.</div></div></article>
    <article class="card"><div class="card-header"><div><h2>Telegram</h2><span class="small muted">Para no exponer el token del bot en GitHub Pages, se recomienda una función proxy o Supabase Edge Function.</span></div>${badge(t.enabled?'HABILITADO':'DESHABILITADO')}</div><div class="card-body"><form id="telegramIntegrationForm"><div class="form-grid">
      <div class="field span-3"><label><input name="enabled" type="checkbox" ${t.enabled?'checked':''}> Activar Telegram</label></div><div class="field span-3"><label>Modo</label><select name="mode"><option value="proxy" selected>Proxy seguro</option></select></div><div class="field span-6"><label>URL del proxy</label><input name="proxyUrl" type="url" value="${escapeHtml(t.proxyUrl||'')}" placeholder="https://.../telegram"></div><div class="field span-4"><label>Chat ID</label><input name="chatId" value="${escapeHtml(t.chatId||'')}"></div><div class="field span-4"><label><input name="sendTransactions" type="checkbox" ${t.sendTransactions!==false?'checked':''}> Avisar nuevas compras</label></div><div class="field span-4"><label><input name="sendTransfers" type="checkbox" ${t.sendTransfers!==false?'checked':''}> Avisar transferencias</label></div>
    </div><div class="form-actions"><button class="button" type="submit">Guardar Telegram</button><button class="button button-secondary" id="testTelegram" type="button">Enviar prueba</button><a class="button button-ghost" href="./TELEGRAM_SETUP.md" target="_blank" rel="noopener">Guía Telegram</a></div></form></div></article>
  </section>`;
}

function renderRules(){
  const r=store.settings.rules||{};
  return `<section class="grid grid-2">
    <article class="card"><div class="card-header"><h2>Reglas operativas</h2></div><div class="card-body"><form id="rulesForm"><div class="form-grid">
      <div class="field span-4"><label>Ventana de compra similar</label><div class="row"><input name="duplicateWindowDays" type="number" min="0" max="30" value="${Number(r.duplicateWindowDays??3)}"><span class="muted">días</span></div></div>
      <div class="field span-4"><label>Intervalo de recordatorio</label><div class="row"><input name="reminderIntervalMinutes" type="number" min="10" max="1440" value="${Number(r.reminderIntervalMinutes||60)}"><span class="muted">minutos</span></div></div>
      <div class="field span-4"><label>Límite de descripción</label><div class="row"><input name="descriptionLimit" type="number" min="50" max="5000" value="${Number(r.descriptionLimit||500)}"><span class="muted">caracteres</span></div></div>
      <div class="field"><label>Nombre de grupo</label><input name="groupName" value="${escapeHtml(store.settings.groupName||'PROYECTOS')}"></div>
    </div><div class="form-actions"><button class="button" type="submit">Guardar reglas</button></div></form></div></article>
    <article class="card"><div class="card-header"><h2>Respaldo del navegador</h2></div><div class="card-body stack">
      <p class="muted">El respaldo JSON puede incluir compras, mensajes, auditoría y evidencias guardadas en este dispositivo.</p>
      <div class="form-actions" style="justify-content:flex-start"><button type="button" class="button" id="exportBackup">Descargar respaldo completo</button><label class="button button-secondary" for="importBackup">Importar respaldo</label><input id="importBackup" type="file" accept="application/json,.json" hidden></div><hr><h3>Configuración portable</h3><p class="small muted">Exporta estructura de formularios, catálogos, reglas e integraciones para reutilizarla en GitHub Pages o en la futura APK, sin movimientos ni evidencias.</p><div class="form-actions" style="justify-content:flex-start"><button type="button" class="button" id="exportConfig">Exportar configuración JSON</button><label class="button button-secondary" for="importConfig">Importar configuración</label><a class="button button-ghost" href="./SKC_configuracion_prototipo_ejemplo.json" download>Plantilla de configuración</a><input id="importConfig" type="file" accept="application/json,.json" hidden></div>
      <div class="alert alert-warning"><strong>No suba respaldos ni facturas al repositorio público.</strong> GitHub Pages debe contener solo el código estático.</div>
      ${store.canManageAdministration()?'<button type="button" class="button button-danger" id="resetApp">Borrar datos locales y reiniciar</button>':''}
    </div></article>
  </section>`;
}

function addProjectGroup(container){
  container.querySelector('#projectEmpty')?.remove();
  const x=document.createElement('div');x.className='catalog-group';x.dataset.projectGroup='';x.dataset.id=uuid();x.innerHTML=`<div class="row space-between"><strong>Nueva descripción y Proyectos 2</strong><button type="button" class="button button-danger button-compact" data-remove-project-group>Eliminar</button></div><div class="form-grid" style="margin-top:12px"><div class="field span-5"><label class="required">Descripción base</label><input data-project-description></div><div class="field span-7"><label class="required">Lista de Proyecto 2</label><textarea data-project-options placeholder="Un proyecto por línea"></textarea></div></div>`;container.append(x);x.querySelector('[data-remove-project-group]').addEventListener('click',()=>x.remove());x.querySelector('input')?.focus();
}


function renderMobileSettingsHome(session){
  const u=store.currentUser(),s=store.settings.sync||{};
  return `<div class="mobile-page"><div class="mobile-settings-menu">
    <section class="mobile-setting-group">
      <button class="mobile-setting-link" type="button" data-mobile-settings="users">${mobileIcon('●')}<span><strong>Perfil y usuario</strong><small>Gestiona usuarios, roles, permisos y saldos.</small></span><span>›</span></button>
      <button class="mobile-setting-link" type="button" data-mobile-settings="catalogs">${mobileIcon('▱','purple')}<span><strong>Catálogos</strong><small>Administra descripciones, Proyecto 2 y listas.</small></span><span>›</span></button>
    </section>
    <section class="mobile-setting-group">
      <button class="mobile-setting-link" type="button" data-mobile-settings="users">${mobileIcon('●●','green')}<span><strong>Usuarios y permisos</strong><small>Invita usuarios y asigna roles.</small></span><span>›</span></button>
      <div class="mobile-setting-toggle"><span><strong>Permitir enviar transferencias</strong><small>Habilita esta función para ${escapeHtml(u.name)}.</small></span><label class="mobile-toggle"><input id="mobileTransferToggle" type="checkbox" ${u.transferEnabled?'checked':''} ${store.canManageAdministration()?'':'disabled'}><span></span></label></div>
    </section>
    <section class="mobile-setting-group">
      <button class="mobile-setting-link" type="button" data-mobile-settings="forms">${mobileIcon('☷','purple')}<span><strong>Diseño de formularios</strong><small>Muestra, oculta y reorganiza campos.</small></span><span>›</span></button>
      <button class="mobile-setting-link" type="button" data-mobile-settings="integrations">${mobileIcon('↗')}<span><strong>Integraciones</strong><small>Supabase Storage, Excel y conexiones opcionales.</small></span><span>›</span></button>
    </section>
    <section class="mobile-setting-group">
      <button class="mobile-setting-link" type="button" data-mobile-settings="sync">${mobileIcon('☁')}<span><strong>Sincronización</strong><small>Configura datos compartidos y frecuencia.</small></span><span>›</span></button>
      <div class="mobile-setting-toggle"><span><strong>Sincronización automática</strong><small>Actualiza datos en segundo plano.</small></span><label class="mobile-toggle"><input id="mobileAutoSyncToggle" type="checkbox" ${s.auto!==false?'checked':''}><span></span></label></div>
      <div class="mobile-health"><div class="mobile-health-line"><span>✓ Estado de la base local</span>${badge('SALUDABLE')}</div><div class="mobile-health-line"><span>◷ Último respaldo</span><strong>${dateLabel(store.settings.pilot?.lastBackupAt,true)}</strong></div></div>
      <button class="mobile-setting-link" type="button" data-mobile-settings="rules">${mobileIcon('▤','orange')}<span><strong>Respaldos</strong><small>Exporta, importa o reinicia datos locales.</small></span><span>›</span></button>
    </section>
    <section class="mobile-setting-group">
      <button class="mobile-setting-link" type="button" data-mobile-settings="rules">${mobileIcon('●','orange')}<span><strong>Notificaciones</strong><small>Configura recordatorios y reglas operativas.</small></span><span>›</span></button>
      <div class="mobile-setting-toggle"><span><strong>Recordatorios activos</strong><small>Recibe avisos mientras la app está abierta.</small></span><label class="mobile-toggle"><input id="mobileNotificationsToggle" type="checkbox" ${store.settings.notificationsEnabled?'checked':''}><span></span></label></div>
    </section>
  </div></div>`;
}

export async function renderSettings(app){
  const session=await sync.session().catch(()=>null);
  const actions=store.canManageAdministration()&&tab==='users'?'<button class="button" id="headerAddUser" type="button">Agregar usuario</button>':'';
  if(isMobileView()&&mobileSection==='home')app.innerHTML=renderMobileSettingsHome(session);
  else app.innerHTML=`${isMobileView()?'<button class="button button-ghost" id="mobileSettingsBack" type="button">‹ Volver a Configuración</button>':pageHeader('Configuración','Administra usuarios, formularios, integraciones, conexión y respaldos.',actions,'Administración')}<div class="tabs"><button class="tab ${tab==='setup'?'active':''}" data-settings-tab="setup">Preparación</button><button class="tab ${tab==='users'?'active':''}" data-settings-tab="users">Usuarios</button><button class="tab ${tab==='catalogs'?'active':''}" data-settings-tab="catalogs">Catálogos</button><button class="tab ${tab==='forms'?'active':''}" data-settings-tab="forms">Formularios</button><button class="tab ${tab==='integrations'?'active':''}" data-settings-tab="integrations">Integraciones</button><button class="tab ${tab==='sync'?'active':''}" data-settings-tab="sync">Base compartida</button><button class="tab ${tab==='rules'?'active':''}" data-settings-tab="rules">Reglas y respaldo</button></div><div id="settingsPanel">${tab==='setup'?renderSetup(session):tab==='users'?renderUsers():tab==='catalogs'?renderCatalogs():tab==='forms'?renderForms():tab==='integrations'?renderIntegrations():tab==='sync'?renderSync(session):renderRules()}</div>`;

  $all('[data-mobile-settings]',app).forEach(b=>b.addEventListener('click',()=>{setTab(b.dataset.mobileSettings);mobileSection='detail';renderSettings(app)}));
  $('#mobileSettingsBack',app)?.addEventListener('click',()=>{mobileSection='home';renderSettings(app)});
  $('#mobileTransferToggle',app)?.addEventListener('change',async e=>{try{await store.saveUser({...store.currentUser(),transferEnabled:e.target.checked});toast('Permiso actualizado.','success');renderSettings(app)}catch(err){toast(err.message,'error')}});
  $('#mobileAutoSyncToggle',app)?.addEventListener('change',async e=>{await store.saveSettings({sync:{auto:e.target.checked}});sync.startPolling();toast(e.target.checked?'Sincronización automática activada.':'Sincronización automática pausada.','success')});
  $('#mobileNotificationsToggle',app)?.addEventListener('change',async e=>{await store.saveSettings({notificationsEnabled:e.target.checked});toast('Preferencia de notificaciones guardada.','success')});
  $all('[data-settings-tab]',app).forEach(b=>b.addEventListener('click',()=>{setTab(b.dataset.settingsTab);mobileSection='detail';renderSettings(app)}));
  $all('[data-open-settings]',app).forEach(b=>b.addEventListener('click',()=>{setTab(b.dataset.openSettings);mobileSection='detail';renderSettings(app)}));
  const add=async()=>{try{if(await editUser())renderSettings(app)}catch(e){toast(e.message,'error')}};
  $('#addUser',app)?.addEventListener('click',add);$('#headerAddUser',app)?.addEventListener('click',add);
  $all('[data-edit-user]',app).forEach(b=>b.addEventListener('click',async()=>{try{if(await editUser(store.userById(b.dataset.editUser)))renderSettings(app)}catch(e){toast(e.message,'error')}}));

  const groups=$('#projectGroups',app);if(groups){
    $('#addProjectGroup',app).addEventListener('click',()=>addProjectGroup(groups));
    $all('[data-remove-project-group]',groups).forEach(b=>b.addEventListener('click',()=>b.closest('[data-project-group]').remove()));
    $('#catalogForm',app).addEventListener('submit',async e=>{e.preventDefault();try{const f=e.currentTarget,projects=$all('[data-project-group]',f).map(g=>({id:g.dataset.id||uuid(),description:g.querySelector('[data-project-description]').value,project2Options:parseLines(g.querySelector('[data-project-options]').value)}));await store.saveCatalogs({projects,costCenters:parseLines(f.elements.costCenters.value),secondaryCosts:parseLines(f.elements.secondaryCosts.value),evidenceStatuses:parseLines(f.elements.evidenceStatuses.value),paymentMethods:parseLines(f.elements.paymentMethods.value)});toast('Catálogos actualizados.','success');renderSettings(app)}catch(err){toast(err.message,'error')}});
  }

  $('#syncConfigForm',app)?.addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget,d=Object.fromEntries(new FormData(f));try{const supabaseUrl=normalizeSupabaseUrl(d.supabaseUrl),anonKey=d.anonKey.trim();if(d.provider==='supabase'&&!supabaseUrl)throw new Error('Escriba una URL válida de Supabase.');if(/^sb_secret_/i.test(anonKey))throw new Error('No use una Secret key. Copie la Publishable key de Supabase.');await store.saveSettings({sync:{provider:d.provider,supabaseUrl,anonKey,pollSeconds:Math.min(3600,Math.max(10,Number(d.pollSeconds||20))),allowSelfSignUp:f.elements.allowSelfSignUp.checked,lockUserToEmail:f.elements.lockUserToEmail.checked}});const session=await sync.session().catch(()=>null);if(session)await sync.bindSessionUser(session);sync.startPolling();toast('Configuración de conexión guardada.','success');renderSettings(app)}catch(err){toast(err.message,'error')}});
  const auth=$('#authForm',app);auth?.addEventListener('submit',async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(auth));try{await sync.login(d.email,d.password);sync.startPolling();toast('Sesión iniciada.','success');renderSettings(app)}catch(err){toast(err.message,'error')}});
  $('#signUpSync',app)?.addEventListener('click',async()=>{const d=Object.fromEntries(new FormData(auth));try{if(!d.email||String(d.password||'').length<6)throw new Error('Escriba un correo y una contraseña de al menos 6 caracteres.');const s=await sync.signUp(d.email,d.password);toast(s.access_token?'Cuenta creada y sesión iniciada.':'Cuenta creada. Revise el correo para confirmarla.','success');renderSettings(app)}catch(err){toast(err.message,'error')}});
  $('#testSync',app)?.addEventListener('click',async()=>{try{await sync.testConnection();toast('Supabase respondió correctamente.','success')}catch(err){toast(err.message,'error')}});
  $('#syncNowSettings',app)?.addEventListener('click',async()=>{try{const r=await sync.syncNow();toast(`Recibidos: ${r.imported}. Enviados: ${r.sent}.`,'success');renderSettings(app)}catch(err){toast(err.message,'error')}});
  $('#logoutSync',app)?.addEventListener('click',async()=>{await sync.logout();sync.stopPolling();toast('Sesión cerrada.','success');renderSettings(app)});

  $('#formModuleSelect',app)?.addEventListener('change',e=>{formModule=e.target.value;renderSettings(app)});
  const moveField=(button,delta)=>{const row=button.closest('[data-form-field]'),body=row?.parentElement;if(!row||!body)return;const target=delta<0?row.previousElementSibling:row.nextElementSibling;if(!target)return;if(delta<0)body.insertBefore(row,target);else body.insertBefore(target,row);[...body.children].forEach((r,i)=>{const input=r.querySelector('[name=fieldOrder]');if(input)input.value=i})};
  $all('[data-field-up]',app).forEach(b=>b.addEventListener('click',()=>moveField(b,-1)));$all('[data-field-down]',app).forEach(b=>b.addEventListener('click',()=>moveField(b,1)));
  const saveLayout=async layout=>{await store.saveSettings({forms:{[formModule]:layout}});toast('Estructura del formulario guardada.','success');renderSettings(app)};
  $('#formLayoutForm',app)?.addEventListener('submit',async e=>{e.preventDefault();try{const rows=$all('[data-form-field]',e.currentTarget),base=new Map(FORM_SCHEMAS[formModule].fields.map(x=>[x.id,x])),layout=rows.map((row,index)=>{const id=row.dataset.formField,b=base.get(id),visible=b?.core?true:row.querySelector('[name=fieldVisible]')?.checked!==false,required=b?.core&&b.required?true:Boolean(row.querySelector('[name=fieldRequired]')?.checked),defaultValue=row.querySelector('[name=fieldDefault]')?.value||'',label=row.querySelector('[name=fieldLabel]')?.value||b?.label||id;if(required&&!visible&&!defaultValue.trim())throw new Error(`“${label}” está oculto y es obligatorio. Asígnele un valor por defecto o vuelva a mostrarlo.`);return{id,label,visible,required,defaultValue,order:index}});await saveLayout(layout)}catch(err){toast(err.message,'error')}});
  $('#simpleFormPreset',app)?.addEventListener('click',async()=>{try{await saveLayout(defaultFormLayouts()[formModule])}catch(err){toast(err.message,'error')}});
  $('#completeFormPreset',app)?.addEventListener('click',async()=>{try{const current=getFormLayout(store.settings,formModule).map((x,i)=>({...x,visible:true,order:i}));await saveLayout(current)}catch(err){toast(err.message,'error')}});

  const saveMicrosoft=async()=>{const f=$('#microsoftIntegrationForm',app);if(!f)return;const d=Object.fromEntries(new FormData(f)),redirectUri=f.elements.redirectUri.value.trim();await store.saveSettings({integrations:{microsoft:{enabled:f.elements.enabled.checked,tenantId:d.tenantId.trim()||'common',clientId:d.clientId.trim(),redirectUri:redirectUri||'auto',scopes:normalizeGraphScopes(parseLines(d.scopes),f.elements.sendOutlook.checked),driveFolder:d.driveFolder.trim()||'SKC Facturas',uploadEvidence:f.elements.uploadEvidence.checked,sendOutlook:f.elements.sendOutlook.checked,notifyEmail:d.notifyEmail.trim()}}})};
  $('#microsoftIntegrationForm',app)?.addEventListener('submit',async e=>{e.preventDefault();try{await saveMicrosoft();toast('Configuración Microsoft guardada.','success');renderSettings(app)}catch(err){toast(err.message,'error')}});
  $('#connectMicrosoft',app)?.addEventListener('click',async()=>{try{await saveMicrosoft();await graph.connect()}catch(err){toast(err.message,'error','No se pudo conectar Microsoft')}});
  $('#testMicrosoft',app)?.addEventListener('click',async()=>{try{await saveMicrosoft();const me=await graph.test(),c=graph.config();let detail='Identidad verificada.';if(c.uploadEvidence){const content=`Prueba de conexión SKC Facturas\n${nowIso()}\n`,item=await graph.uploadFile('Pruebas','conexion-SKC.txt',new Blob([content],{type:'text/plain'}));detail=`OneDrive listo: ${item.name||'conexion-SKC.txt'}.`}await store.saveSettings({pilot:{lastGraphTestAt:nowIso()}});toast(`${me.displayName||me.userPrincipalName||'Usuario Microsoft'} · ${detail}`,'success','Microsoft Graph listo')}catch(err){toast(err.message,'error','Prueba de Graph fallida')}});
  $('#testOutlook',app)?.addEventListener('click',async()=>{try{await saveMicrosoft();const c=graph.config();await graph.sendMail({to:c.notifyEmail,subject:'SKC Facturas · Prueba de Outlook',html:`<h2>Conexión correcta</h2><p>SKC Facturas pudo enviar este mensaje mediante Microsoft Graph.</p><p>${escapeHtml(nowIso())}</p>`});await store.saveSettings({pilot:{lastOutlookTestAt:nowIso()}});toast(`Correo de prueba enviado a ${c.notifyEmail}.`,'success','Outlook listo')}catch(err){toast(err.message,'error','Prueba de Outlook fallida')}});
  $('#disconnectMicrosoft',app)?.addEventListener('click',()=>{graph.disconnect();toast('Sesión Microsoft eliminada de este dispositivo.','success');renderSettings(app)});
  $('#copyRedirectUri',app)?.addEventListener('click',async()=>{try{const value=$('#microsoftIntegrationForm',app)?.elements.redirectUri.value||graph.config().redirectUri;await navigator.clipboard.writeText(value);toast('Redirect URI copiado.','success')}catch{toast('Seleccione y copie manualmente el Redirect URI.','info')}});
  $('#downloadGraphTemplate',app)?.addEventListener('click',()=>{const c=graph.config(),x={format:'skc-microsoft-graph-setup',version:1,applicationType:'Single-page application (SPA)',redirectUris:[c.redirectUri],tenantId:c.tenantId,clientId:c.clientId||'PEGAR_CLIENT_ID',delegatedPermissions:c.scopes,notes:['No crear Client Secret para GitHub Pages ni APK.','Usar Authorization Code Flow con PKCE.','Conceder consentimiento de administrador si la política del tenant lo exige.']};downloadBlob(new Blob([JSON.stringify(x,null,2)],{type:'application/json'}),'SKC_Microsoft_Graph_setup.json')});

  const saveExcel=async()=>{const f=$('#excelIntegrationForm',app);if(!f)return;const d=Object.fromEntries(new FormData(f));await store.saveSettings({integrations:{excel:{enabled:f.elements.enabled.checked,filename:(d.filename||'SKC_Registro_Oficial.xlsx').trim(),sheetName:(d.sheetName||'REGISTRO').trim(),onlySynced:f.elements.onlySynced.checked,oneDriveFolder:(d.oneDriveFolder||'Excel oficial').trim(),autoUpload:store.canManageAdministration()?f.elements.autoUpload.checked:Boolean(store.settings.integrations?.excel?.autoUpload)}}})};
  $('#excelIntegrationForm',app)?.addEventListener('submit',async e=>{e.preventDefault();try{await saveExcel();toast('Configuración del Excel oficial guardada.','success');renderSettings(app)}catch(err){toast(err.message,'error')}});
  $('#downloadOfficialExcel',app)?.addEventListener('click',async()=>{try{await saveExcel();const r=await officialExcel.download();toast(`${r.name} generado correctamente.`, 'success','Excel oficial listo')}catch(err){toast(err.message,'error','No se pudo generar el Excel')}});
  $('#uploadOfficialExcel',app)?.addEventListener('click',async()=>{try{await saveExcel();const item=await officialExcel.uploadToOneDrive();toast(`${item.name||officialExcel.config().filename} actualizado en OneDrive.`, 'success','Excel oficial sincronizado')}catch(err){toast(err.message,'error','No se pudo subir el Excel')}});

  $('#telegramIntegrationForm',app)?.addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget,d=Object.fromEntries(new FormData(f));try{await store.saveSettings({integrations:{telegram:{enabled:f.elements.enabled.checked,mode:d.mode||'proxy',proxyUrl:d.proxyUrl.trim(),chatId:d.chatId.trim(),sendTransactions:f.elements.sendTransactions.checked,sendTransfers:f.elements.sendTransfers.checked}}});toast('Configuración Telegram guardada.','success');renderSettings(app)}catch(err){toast(err.message,'error')}});
  $('#testTelegram',app)?.addEventListener('click',async()=>{try{const f=$('#telegramIntegrationForm',app);if(f){const d=Object.fromEntries(new FormData(f));await store.saveSettings({integrations:{telegram:{enabled:f.elements.enabled.checked,mode:d.mode||'proxy',proxyUrl:d.proxyUrl.trim(),chatId:d.chatId.trim(),sendTransactions:f.elements.sendTransactions.checked,sendTransfers:f.elements.sendTransfers.checked}}})}await integrations.testTelegram();toast('Telegram respondió correctamente.','success')}catch(err){toast(err.message,'error','Prueba de Telegram fallida')}});

  $('#rulesForm',app)?.addEventListener('submit',async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));try{await store.saveSettings({groupName:d.groupName.trim()||'PROYECTOS',rules:{duplicateWindowDays:Math.max(0,Number(d.duplicateWindowDays||0)),reminderIntervalMinutes:Math.max(10,Number(d.reminderIntervalMinutes||60)),descriptionLimit:Math.max(50,Number(d.descriptionLimit||500))}});toast('Reglas guardadas.','success');renderSettings(app)}catch(err){toast(err.message,'error')}});
  $('#exportBackup',app)?.addEventListener('click',async()=>{try{const x=await store.exportSnapshot(true),blob=new Blob([JSON.stringify(x,null,2)],{type:'application/json'}),name=`SKC_Facturas_respaldo_${nowIso().replace(/[:.]/g,'-')}.json`;downloadBlob(blob,name);await store.saveSettings({pilot:{lastBackupAt:nowIso()}});toast('Respaldo descargado.','success');renderSettings(app)}catch(err){toast(err.message,'error')}});
  $('#importBackup',app)?.addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{const snapshot=JSON.parse(await file.text());const replace=Boolean(await confirmDialog('¿Reemplazar esta instalación?','“Reemplazar todo” borra primero los datos locales e importa también la configuración segura del respaldo. Si prefiere conservar la configuración de este dispositivo, pulse Cancelar y podrá elegir Combinar.','Reemplazar todo',true));if(replace){await store.importSnapshot(snapshot,true);toast('Respaldo restaurado y configuración local reemplazada.','success')}else{const combine=await confirmDialog('Combinar respaldo','Combina entidades y evidencias, pero conserva la conexión, sesión y preferencias de este dispositivo.','Combinar datos');if(!combine)return;await store.importSnapshot(snapshot,false);toast('Datos del respaldo combinados.','success')}renderSettings(app)}catch(err){toast(err.message,'error')}finally{e.target.value=''}});
  $('#exportConfig',app)?.addEventListener('click',async()=>{try{const x=await store.exportConfiguration(false),blob=new Blob([JSON.stringify(x,null,2)],{type:'application/json'}),name=`SKC_configuracion_${nowIso().replace(/[:.]/g,'-')}.json`;downloadBlob(blob,name);toast('Configuración portable descargada.','success')}catch(err){toast(err.message,'error')}});
  $('#importConfig',app)?.addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{const cfg=JSON.parse(await file.text()),replaceUsers=Boolean(await confirmDialog('Importar usuarios','Además de reglas, formularios, catálogos e integraciones, ¿desea importar también la lista de usuarios incluida en el JSON?','Importar usuarios'));await store.importConfiguration(cfg,{replaceUsers});toast('Configuración importada. Revise usuarios y conexiones antes de operar.','success');renderSettings(app)}catch(err){toast(err.message,'error')}finally{e.target.value=''}});
  $('#resetApp',app)?.addEventListener('click',async()=>{const ok=await confirmDialog('Borrar datos locales','Esta acción elimina la base y las evidencias de este navegador. Descargue un respaldo antes de continuar.','Borrar todo',true);if(ok){await store.reset();toast('La instalación local fue reiniciada.','success');renderSettings(app)}});
}
