import {store} from '../store.js';
import {sync} from '../sync.js';
import {dateLabel,downloadBlob,escapeHtml,money,nowIso,parseLines,uuid} from '../utils.js';
import {$,$all,badge,confirmDialog,optionsHtml,pageHeader,showModal,toast} from '../ui.js';

let tab='users';

function userRows(){
  const rows=store.users(true);
  return rows.length?rows.map(u=>`<tr>
    <td><strong>${escapeHtml(u.name)}</strong><br><span class="small muted">${escapeHtml(u.email||'Sin correo')}</span></td>
    <td>${badge(u.role)}</td>
    <td>${badge(u.transferEnabled?'HABILITADO':'BLOQUEADO')}</td>
    <td>${money(u.initialBalance||0)}</td>
    <td>${badge(u.active===false?'INACTIVO':'ACTIVO')}</td>
    <td>${store.isAdmin()?`<button type="button" class="button button-secondary button-compact" data-edit-user="${u.id}">Editar</button>`:'—'}</td>
  </tr>`).join(''):'<tr><td colspan="6" class="empty-state">No hay usuarios.</td></tr>';
}

async function editUser(user=null){
  if(!store.isAdmin())throw new Error('Solo un administrador puede modificar usuarios.');
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

function renderUsers(){
  return `<section class="card">
    <div class="card-header"><div><h2>Usuarios y permisos</h2><span class="small muted">El responsable del saldo puede ser distinto de quien rellena el formulario.</span></div>${store.isAdmin()?'<button type="button" class="button" id="addUser">Agregar usuario</button>':''}</div>
    <div class="table-wrap"><table><thead><tr><th>Usuario</th><th>Rol</th><th>Transferencias</th><th>Saldo inicial</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${userRows()}</tbody></table></div>
  </section>${!store.isAdmin()?'<div class="alert alert-warning" style="margin-top:14px">Inicie como administrador para modificar usuarios, permisos y saldos iniciales.</div>':''}`;
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
  if(!store.isAdmin())return '<div class="alert alert-warning">Solo un administrador puede editar catálogos.</div>';
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
        <div class="field"><label>Consulta de cambios cada</label><div class="row"><input name="pollSeconds" type="number" min="10" max="3600" value="${Math.max(10,Number(s.pollSeconds||20))}"><span class="muted">segundos</span></div></div>
      </div><div class="form-actions"><a class="button button-secondary" href="./supabase-schema.sql" download>Descargar esquema SQL</a><button class="button" type="submit">Guardar conexión</button></div></form>
      ${provider==='local'?'<div class="alert" style="margin-top:14px">Modo local: funciona sin servidor, incluso sin conexión después de la primera carga. Cada navegador conserva su propia base.</div>':configured?'<div class="alert alert-success" style="margin-top:14px">Configuración de Supabase completa. Falta iniciar sesión o probar la conexión.</div>':'<div class="alert alert-warning" style="margin-top:14px">Complete URL y clave anónima para activar el modo compartido.</div>'}
    </div></article>
    <article class="card"><div class="card-header"><div><h2>Sesión y sincronización</h2><span class="small muted">Los cambios se publican como eventos idempotentes.</span></div>${badge(session?'CONECTADO':'SIN SESIÓN')}</div><div class="card-body">
      ${session?`<div class="stack"><div class="alert alert-success"><strong>Sesión activa</strong><br>${escapeHtml(session.user?.email||'Usuario autenticado')}</div><div><strong>Última sincronización:</strong> ${dateLabel(s.lastSyncAt,true)}</div><div class="form-actions"><button type="button" class="button button-secondary" id="testSync">Probar conexión</button><button type="button" class="button" id="syncNowSettings">Sincronizar ahora</button><button type="button" class="button button-danger" id="logoutSync">Cerrar sesión</button></div></div>`:`<form id="authForm"><div class="form-grid"><div class="field"><label>Correo</label><input name="email" type="email" autocomplete="username" required></div><div class="field"><label>Contraseña</label><input name="password" type="password" minlength="6" autocomplete="current-password" required></div></div><div class="form-actions"><button type="button" class="button button-secondary" id="signUpSync">Crear cuenta</button><button class="button" type="submit">Iniciar sesión</button></div></form>`}
      <hr><div class="small muted">La evidencia se guarda en el bucket privado <span class="mono">skc-evidence</span>. El navegador nunca necesita una clave administrativa.</div>
    </div></article>
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
      <div class="form-actions" style="justify-content:flex-start"><button type="button" class="button" id="exportBackup">Descargar respaldo</button><label class="button button-secondary" for="importBackup">Importar respaldo</label><input id="importBackup" type="file" accept="application/json,.json" hidden></div>
      <div class="alert alert-warning"><strong>No suba respaldos ni facturas al repositorio público.</strong> GitHub Pages debe contener solo el código estático.</div>
      ${store.isAdmin()?'<button type="button" class="button button-danger" id="resetApp">Borrar datos locales y reiniciar</button>':''}
    </div></article>
  </section>`;
}

function addProjectGroup(container){
  container.querySelector('#projectEmpty')?.remove();
  const x=document.createElement('div');x.className='catalog-group';x.dataset.projectGroup='';x.dataset.id=uuid();x.innerHTML=`<div class="row space-between"><strong>Nueva descripción y Proyectos 2</strong><button type="button" class="button button-danger button-compact" data-remove-project-group>Eliminar</button></div><div class="form-grid" style="margin-top:12px"><div class="field span-5"><label class="required">Descripción base</label><input data-project-description></div><div class="field span-7"><label class="required">Lista de Proyecto 2</label><textarea data-project-options placeholder="Un proyecto por línea"></textarea></div></div>`;container.append(x);x.querySelector('[data-remove-project-group]').addEventListener('click',()=>x.remove());x.querySelector('input')?.focus();
}

export async function renderSettings(app){
  const session=await sync.session().catch(()=>null);
  const actions=store.isAdmin()&&tab==='users'?'<button class="button" id="headerAddUser" type="button">Agregar usuario</button>':'';
  app.innerHTML=`${pageHeader('Configuración','Administra usuarios, listas desplegables, conexión y respaldos.',actions,'Administración')}<div class="tabs"><button class="tab ${tab==='users'?'active':''}" data-settings-tab="users">Usuarios</button><button class="tab ${tab==='catalogs'?'active':''}" data-settings-tab="catalogs">Catálogos</button><button class="tab ${tab==='sync'?'active':''}" data-settings-tab="sync">Sincronización</button><button class="tab ${tab==='rules'?'active':''}" data-settings-tab="rules">Reglas y respaldo</button></div><div id="settingsPanel">${tab==='users'?renderUsers():tab==='catalogs'?renderCatalogs():tab==='sync'?renderSync(session):renderRules()}</div>`;

  $all('[data-settings-tab]',app).forEach(b=>b.addEventListener('click',()=>{tab=b.dataset.settingsTab;renderSettings(app)}));
  const add=async()=>{try{if(await editUser())renderSettings(app)}catch(e){toast(e.message,'error')}};
  $('#addUser',app)?.addEventListener('click',add);$('#headerAddUser',app)?.addEventListener('click',add);
  $all('[data-edit-user]',app).forEach(b=>b.addEventListener('click',async()=>{try{if(await editUser(store.userById(b.dataset.editUser)))renderSettings(app)}catch(e){toast(e.message,'error')}}));

  const groups=$('#projectGroups',app);if(groups){
    $('#addProjectGroup',app).addEventListener('click',()=>addProjectGroup(groups));
    $all('[data-remove-project-group]',groups).forEach(b=>b.addEventListener('click',()=>b.closest('[data-project-group]').remove()));
    $('#catalogForm',app).addEventListener('submit',async e=>{e.preventDefault();try{const f=e.currentTarget,projects=$all('[data-project-group]',f).map(g=>({id:g.dataset.id||uuid(),description:g.querySelector('[data-project-description]').value,project2Options:parseLines(g.querySelector('[data-project-options]').value)}));await store.saveCatalogs({projects,costCenters:parseLines(f.elements.costCenters.value),secondaryCosts:parseLines(f.elements.secondaryCosts.value),evidenceStatuses:parseLines(f.elements.evidenceStatuses.value),paymentMethods:parseLines(f.elements.paymentMethods.value)});toast('Catálogos actualizados.','success');renderSettings(app)}catch(err){toast(err.message,'error')}});
  }

  $('#syncConfigForm',app)?.addEventListener('submit',async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));try{await store.saveSettings({sync:{provider:d.provider,supabaseUrl:d.supabaseUrl.trim(),anonKey:d.anonKey.trim(),pollSeconds:Math.max(10,Number(d.pollSeconds||20))}});sync.startPolling();toast('Configuración de conexión guardada.','success');renderSettings(app)}catch(err){toast(err.message,'error')}});
  const auth=$('#authForm',app);auth?.addEventListener('submit',async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(auth));try{await sync.login(d.email,d.password);sync.startPolling();toast('Sesión iniciada.','success');renderSettings(app)}catch(err){toast(err.message,'error')}});
  $('#signUpSync',app)?.addEventListener('click',async()=>{const d=Object.fromEntries(new FormData(auth));try{if(!d.email||String(d.password||'').length<6)throw new Error('Escriba un correo y una contraseña de al menos 6 caracteres.');const s=await sync.signUp(d.email,d.password);toast(s.access_token?'Cuenta creada y sesión iniciada.':'Cuenta creada. Revise el correo para confirmarla.','success');renderSettings(app)}catch(err){toast(err.message,'error')}});
  $('#testSync',app)?.addEventListener('click',async()=>{try{await sync.testConnection();toast('Supabase respondió correctamente.','success')}catch(err){toast(err.message,'error')}});
  $('#syncNowSettings',app)?.addEventListener('click',async()=>{try{const r=await sync.syncNow();toast(`Recibidos: ${r.imported}. Enviados: ${r.sent}.`,'success');renderSettings(app)}catch(err){toast(err.message,'error')}});
  $('#logoutSync',app)?.addEventListener('click',async()=>{await sync.logout();sync.stopPolling();toast('Sesión cerrada.','success');renderSettings(app)});

  $('#rulesForm',app)?.addEventListener('submit',async e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget));try{await store.saveSettings({groupName:d.groupName.trim()||'PROYECTOS',rules:{duplicateWindowDays:Math.max(0,Number(d.duplicateWindowDays||0)),reminderIntervalMinutes:Math.max(10,Number(d.reminderIntervalMinutes||60)),descriptionLimit:Math.max(50,Number(d.descriptionLimit||500))}});toast('Reglas guardadas.','success');renderSettings(app)}catch(err){toast(err.message,'error')}});
  $('#exportBackup',app)?.addEventListener('click',async()=>{try{const x=await store.exportSnapshot(true),blob=new Blob([JSON.stringify(x,null,2)],{type:'application/json'}),name=`SKC_Facturas_respaldo_${nowIso().replace(/[:.]/g,'-')}.json`;downloadBlob(blob,name);toast('Respaldo descargado.','success')}catch(err){toast(err.message,'error')}});
  $('#importBackup',app)?.addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{const replace=await confirmDialog('Importar respaldo','Aceptar combina los datos del respaldo con esta instalación. Para reemplazar todo, primero use “Borrar datos locales”.','Combinar datos');if(!replace)return;await store.importSnapshot(JSON.parse(await file.text()),false);toast('Respaldo importado.','success');renderSettings(app)}catch(err){toast(err.message,'error')}finally{e.target.value=''}});
  $('#resetApp',app)?.addEventListener('click',async()=>{const ok=await confirmDialog('Borrar datos locales','Esta acción elimina la base y las evidencias de este navegador. Descargue un respaldo antes de continuar.','Borrar todo',true);if(ok){await store.reset();toast('La instalación local fue reiniciada.','success');renderSettings(app)}});
}
