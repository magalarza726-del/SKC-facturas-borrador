import {db} from './db.js';
import {store,SYNCABLE_TYPES} from './store.js';
import {cleanText,nowIso,safeFilename} from './utils.js';

const SESSION_KEY='supabaseSession';
const BUCKET='skc-evidence';
const PAGE_SIZE=1000;
const MAX_PULL_PAGES=100;

export function normalizeSupabaseUrl(value){
  const raw=String(value||'').trim();
  if(!raw)return'';
  const withScheme=/^https?:\/\//i.test(raw)?raw:`https://${raw}`;
  try{
    const url=new URL(withScheme);
    if(!/^https?:$/.test(url.protocol))return'';
    return `${url.protocol}//${url.host}`;
  }catch{return raw.replace(/\/(?:rest|auth|storage)\/v1\/?$/i,'').replace(/\/+$/,'')}
}

const encodeStoragePath=path=>String(path||'').split('/').map(encodeURIComponent).join('/');

async function responseError(response,fallback){
  const text=await response.text().catch(()=>'');
  if(text){
    try{const data=JSON.parse(text);return data.message||data.error_description||data.error||data.msg||fallback}catch{}
    return text.slice(0,500);
  }
  return fallback;
}

export class SupabaseSync extends EventTarget{
  constructor(){
    super();
    this.running=false;
    this.currentRun=null;
    this.timer=0;
    this.activeSession=null;
    this.boundUserId='';
  }

  config(){
    const s=store.settings.sync||{};
    return{
      provider:s.provider||'local',
      url:normalizeSupabaseUrl(s.supabaseUrl),
      anonKey:cleanText(s.anonKey),
      pollSeconds:Math.min(3600,Math.max(10,Number(s.pollSeconds||20))),
      auto:s.auto!==false,
      allowSelfSignUp:Boolean(s.allowSelfSignUp),
      lockUserToEmail:s.lockUserToEmail!==false
    };
  }

  isConfigured(){
    const c=this.config();
    return c.provider==='supabase'&&Boolean(c.url&&c.anonKey);
  }

  async bindSessionUser(session){
    const email=cleanText(session?.user?.email).toLowerCase();
    const user=email?store.users(true).find(x=>cleanText(x.email).toLowerCase()===email):null;
    this.boundUserId=user?.id||'';
    if(user&&store.currentUser().id!==user.id)await store.setCurrentUser(user.id);
    return user;
  }

  isUserLocked(){return Boolean(this.config().lockUserToEmail&&this.activeSession)}
  hasBoundIdentity(){const email=cleanText(this.activeSession?.user?.email).toLowerCase(),user=this.boundUserId?store.userById(this.boundUserId):null;return Boolean(user&&user.active!==false&&email&&cleanText(user.email).toLowerCase()===email)}

  async session(){
    const current=await db.getMeta(SESSION_KEY,null);
    if(!current?.access_token){this.activeSession=null;this.boundUserId='';return null}
    if(Number(current.expires_at||0)*1000>Date.now()+60000){
      this.activeSession=current;
      await this.bindSessionUser(current);
      return current;
    }
    if(!current.refresh_token){this.activeSession=null;this.boundUserId='';return null}
    try{return await this.refreshSession(current.refresh_token)}catch{
      await db.setMeta(SESSION_KEY,null);this.activeSession=null;this.boundUserId='';return null;
    }
  }

  async authRequest(path,options={}){
    const c=this.config();
    if(!c.url||!c.anonKey)throw new Error('Configure la URL y la clave pública de Supabase.');
    if(/^sb_secret_/i.test(c.anonKey))throw new Error('No use una Secret key en el navegador. Copie la Publishable key de Supabase.');
    const response=await fetch(`${c.url}/auth/v1/${path}`,{
      ...options,
      headers:{apikey:c.anonKey,'Content-Type':'application/json',...(options.headers||{})}
    });
    if(!response.ok)throw new Error(await responseError(response,`Error de autenticación (${response.status}).`));
    return response.json();
  }

  async login(email,password){
    const session=await this.authRequest('token?grant_type=password',{method:'POST',body:JSON.stringify({email:cleanText(email).toLowerCase(),password})});
    session.expires_at=session.expires_at||Math.floor(Date.now()/1000)+Number(session.expires_in||3600);
    await db.setMeta(SESSION_KEY,session);this.activeSession=session;await this.bindSessionUser(session);this.dispatchEvent(new Event('authchange'));return session;
  }

  async signUp(email,password){
    const session=await this.authRequest('signup',{method:'POST',body:JSON.stringify({email:cleanText(email).toLowerCase(),password})});
    if(session.access_token){session.expires_at=session.expires_at||Math.floor(Date.now()/1000)+Number(session.expires_in||3600);await db.setMeta(SESSION_KEY,session);this.activeSession=session;await this.bindSessionUser(session)}
    this.dispatchEvent(new Event('authchange'));return session;
  }

  async refreshSession(refreshToken){
    const session=await this.authRequest('token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:refreshToken})});
    session.expires_at=session.expires_at||Math.floor(Date.now()/1000)+Number(session.expires_in||3600);
    await db.setMeta(SESSION_KEY,session);this.activeSession=session;await this.bindSessionUser(session);return session;
  }

  async logout(){
    const session=await this.session();
    if(session)try{await this.apiFetch('/auth/v1/logout',{method:'POST'},session)}catch{}
    await db.setMeta(SESSION_KEY,null);this.activeSession=null;this.boundUserId='';this.dispatchEvent(new Event('authchange'));
  }

  async apiFetch(path,options={},session=null){
    const c=this.config(),active=session||await this.session();
    if(!c.url||!c.anonKey)throw new Error('Supabase no está configurado.');
    if(/^sb_secret_/i.test(c.anonKey))throw new Error('La Secret key de Supabase no debe almacenarse en la aplicación. Use la Publishable key.');
    if(!active?.access_token)throw new Error('Inicie sesión en Supabase para sincronizar.');
    const response=await fetch(`${c.url}${path}`,{
      ...options,
      headers:{apikey:c.anonKey,Authorization:`Bearer ${active.access_token}`,...(options.headers||{})}
    });
    if(!response.ok)throw new Error(await responseError(response,`Supabase respondió ${response.status}.`));
    return response;
  }

  async testConnection(){
    const response=await this.apiFetch('/rest/v1/skc_events?select=id&limit=1',{method:'GET',headers:{Accept:'application/json'}});
    await response.json();return true;
  }

  async pull(){
    let imported=0;
    for(let page=0;page<MAX_PULL_PAGES;page+=1){
      const offset=page*PAGE_SIZE;
      const path=`/rest/v1/skc_events?select=id,entity_type,entity_id,payload,updated_at&order=updated_at.asc,id.asc&limit=${PAGE_SIZE}&offset=${offset}`;
      const response=await this.apiFetch(path,{method:'GET',headers:{Accept:'application/json'}});
      const rows=await response.json();
      for(const row of rows){
        if(SYNCABLE_TYPES.includes(row.entity_type)&&row.payload?.id&&await store.mergeRemote(row.entity_type,row.payload))imported+=1;
      }
      if(rows.length<PAGE_SIZE)break;
      if(page===MAX_PULL_PAGES-1)throw new Error('La base contiene demasiados eventos para una sola sincronización. Reduzca el histórico o aumente la paginación.');
    }
    if(imported){await store.reload();if(this.activeSession)await this.bindSessionUser(this.activeSession)}
    return imported;
  }

  async uploadAttachment(type,entity,attachment){
    if(attachment.remotePath)return attachment;
    const file=await db.getFile(attachment.id);
    if(!file?.blob)throw new Error(`No se encontró ${attachment.filename}.`);
    if(file.blob.size>20*1024*1024)throw new Error(`${attachment.filename} supera 20 MB.`);
    const path=`${type}/${entity.id}/${attachment.id}-${safeFilename(attachment.filename)}`;
    await this.apiFetch(`/storage/v1/object/${BUCKET}/${encodeStoragePath(path)}`,{
      method:'POST',
      headers:{'Content-Type':attachment.mime||file.mime||'application/octet-stream','x-upsert':'true'},
      body:file.blob
    });
    await db.putFile({...file,remotePath:path});
    return{...attachment,remotePath:path};
  }

  async pushEntity(type,entity){
    let attachments=Array.isArray(entity.attachments)?[...entity.attachments]:null;
    if(attachments){
      const uploaded=[];
      for(const attachment of attachments)uploaded.push(await this.uploadAttachment(type,entity,attachment));
      attachments=uploaded;
    }
    const payload=structuredClone(entity);
    if(attachments)payload.attachments=attachments;
    payload.syncStatus='SINCRONIZADO';payload.syncError='';
    const row={id:`${type}:${entity.id}`,entity_type:type,entity_id:entity.id,payload,updated_at:entity.updatedAt||entity.createdAt||nowIso()};
    await this.apiFetch('/rest/v1/skc_events?on_conflict=id',{
      method:'POST',headers:{'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(row)
    });
    const verify=await this.apiFetch(`/rest/v1/skc_events?id=eq.${encodeURIComponent(row.id)}&select=payload&limit=1`,{method:'GET',headers:{Accept:'application/json'}});
    const remote=(await verify.json())[0]?.payload;
    if(!remote)throw new Error('No se pudo verificar el evento remoto.');
    const localStamp=String(entity.updatedAt||entity.createdAt||''),remoteStamp=String(remote.updatedAt||remote.createdAt||'');
    if(remoteStamp>localStamp){await store.mergeRemote(type,remote);return true}
    if(remoteStamp!==localStamp)throw new Error('La versión remota no coincide; se reintentará.');
    await store.markSynced(type,entity.id,attachments);return true;
  }

  dependencyKey(type,value){
    if(type==='ledger'&&value.sourceType==='FORMULARIO'&&value.sourceId)return`transactions:${value.sourceId}`;
    if(type==='ledger'&&value.sourceType==='TRANSFERENCIA'&&value.sourceId)return`messages:${value.sourceId}`;
    if(type==='ledger'&&value.sourceType==='SALDO_INICIAL'&&value.sourceId)return`users:${value.sourceId}`;
    if(type==='reminders'&&value.completedTransactionId)return`transactions:${value.completedTransactionId}`;
    return'';
  }

  async push(){
    const pending=await store.pendingEntities(),errors=[],failed=new Set();let sent=0;
    for(const{type,value}of pending){
      const key=`${type}:${value.id}`,dependency=this.dependencyKey(type,value);
      if(dependency&&failed.has(dependency)){
        const message=`Dependencia ${dependency} no sincronizada.`;
        failed.add(key);errors.push(`${type}/${value.id}: ${message}`);await store.markSyncError(type,value.id,message);continue;
      }
      try{await this.pushEntity(type,value);sent+=1}
      catch(error){failed.add(key);errors.push(`${type}/${value.id}: ${error.message}`);await store.markSyncError(type,value.id,error.message)}
    }
    if(sent||errors.length)await store.reload();
    return{sent,errors};
  }

  async syncNow(){
    if(this.currentRun)return this.currentRun;
    if(!this.isConfigured())throw new Error('La aplicación está en modo local. Configure Supabase para compartir datos.');
    this.currentRun=this.runSyncOnce();
    try{return await this.currentRun}finally{this.currentRun=null}
  }

  async runSyncOnce(){
    this.running=true;this.dispatchEvent(new CustomEvent('status',{detail:{running:true,message:'Sincronizando…'}}));
    try{
      const imported=await this.pull();
      const{sent,errors}=await this.push();
      await store.saveSettings({sync:{lastSyncAt:nowIso()}});
      const message=errors.length?`Sincronización parcial: ${imported} recibidos, ${sent} enviados, ${errors.length} error(es).`:`Sincronización lista: ${imported} recibidos, ${sent} enviados.`;
      this.dispatchEvent(new CustomEvent('status',{detail:{running:false,message,completed:true,imported,sent,errors}}));
      return{imported,sent,errors};
    }catch(error){
      this.dispatchEvent(new CustomEvent('status',{detail:{running:false,message:`Sincronización pendiente: ${error.message}`}}));
      throw error;
    }finally{this.running=false}
  }

  startPolling(){
    this.stopPolling();
    if(!this.isConfigured()||!this.config().auto)return;
    this.timer=setInterval(async()=>{
      if(document.visibilityState!=='visible'||this.running)return;
      try{await this.syncNow()}catch{}
    },this.config().pollSeconds*1000);
  }

  stopPolling(){if(this.timer)clearInterval(this.timer);this.timer=0}

  async openAttachment(type,id,attachment){
    const local=await db.getFile(attachment.id);
    if(local?.blob){const url=URL.createObjectURL(local.blob);window.open(url,'_blank','noopener');setTimeout(()=>URL.revokeObjectURL(url),60000);return}
    if(!attachment.remotePath)throw new Error('La evidencia no está disponible en este dispositivo.');
    const response=await this.apiFetch(`/storage/v1/object/authenticated/${BUCKET}/${encodeStoragePath(attachment.remotePath)}`,{method:'GET'}),blob=await response.blob();
    await db.putFile({id:attachment.id,entityKey:`${type}:${id}`,filename:attachment.filename,mime:attachment.mime,size:attachment.size,sha256:attachment.sha256,remotePath:attachment.remotePath,blob});
    const url=URL.createObjectURL(blob);window.open(url,'_blank','noopener');setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
}

export const sync=new SupabaseSync();
