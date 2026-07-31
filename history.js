import {store} from './store.js';
import {cleanText,safeFilename} from './utils.js';

const TOKEN_KEY='skcGraphToken';
const PKCE_KEY='skcGraphPkce';
const GRAPH_ROOT='https://graph.microsoft.com/v1.0';
const textEncoder=new TextEncoder();

const b64url=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const randomString=(length=64)=>{const bytes=new Uint8Array(length);crypto.getRandomValues(bytes);return b64url(bytes)};
async function challenge(verifier){return b64url(new Uint8Array(await crypto.subtle.digest('SHA-256',textEncoder.encode(verifier))))}
function tokenStore(){try{return JSON.parse(sessionStorage.getItem(TOKEN_KEY)||'null')}catch{return null}}
function saveToken(t){if(!t){sessionStorage.removeItem(TOKEN_KEY);return}const now=Math.floor(Date.now()/1000);sessionStorage.setItem(TOKEN_KEY,JSON.stringify({...t,expires_at:Number(t.expires_at||now+Number(t.expires_in||3600))}))}
function config(){
  const c=store.settings.integrations?.microsoft||{};
  const redirectUri=c.redirectUri&&c.redirectUri!=='auto'?c.redirectUri:`${location.origin}${location.pathname}`;
  const scopes=Array.isArray(c.scopes)&&c.scopes.length?c.scopes:['openid','profile','offline_access','User.Read','Files.ReadWrite','Mail.Send'];
  return{enabled:Boolean(c.enabled),tenantId:cleanText(c.tenantId)||'common',clientId:cleanText(c.clientId),redirectUri,scopes,driveFolder:cleanText(c.driveFolder)||'SKC Facturas',uploadEvidence:c.uploadEvidence!==false,sendOutlook:Boolean(c.sendOutlook),notifyEmail:cleanText(c.notifyEmail)};
}
function authority(c=config()){return`https://login.microsoftonline.com/${encodeURIComponent(c.tenantId)}/oauth2/v2.0`}
async function tokenRequest(params,c=config()){
  const body=new URLSearchParams(params);
  const r=await fetch(`${authority(c)}/token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d.error_description||d.error||`Microsoft respondió ${r.status}.`);
  saveToken(d);return d;
}
function cleanAuthQuery(returnHash=''){
  const url=new URL(location.href);for(const k of['code','state','session_state','error','error_description'])url.searchParams.delete(k);
  const next=`${url.pathname}${url.search}${returnHash||url.hash||'#home'}`;history.replaceState(null,'',next);
}
function encodePath(path){return String(path||'').split('/').filter(Boolean).map(encodeURIComponent).join('/')}

export const graph={
  config,
  isConfigured(){const c=config();return c.enabled&&Boolean(c.clientId&&c.tenantId)},
  isConnected(){const t=tokenStore();return Boolean(t?.access_token||t?.refresh_token)},
  async handleRedirectCallback(){
    const url=new URL(location.href),code=url.searchParams.get('code'),state=url.searchParams.get('state'),error=url.searchParams.get('error');
    if(!code&&!error)return false;
    const pkce=JSON.parse(sessionStorage.getItem(PKCE_KEY)||'null');
    if(error){const message=url.searchParams.get('error_description')||error;sessionStorage.removeItem(PKCE_KEY);cleanAuthQuery(pkce?.returnHash);throw new Error(message)}
    if(!pkce||pkce.state!==state||!pkce.verifier)throw new Error('La respuesta de Microsoft no coincide con esta sesión. Vuelva a conectar.');
    const c=config();await tokenRequest({client_id:c.clientId,scope:c.scopes.join(' '),code,redirect_uri:c.redirectUri,grant_type:'authorization_code',code_verifier:pkce.verifier},c);
    sessionStorage.removeItem(PKCE_KEY);cleanAuthQuery(pkce.returnHash);return true;
  },
  async connect(){
    const c=config();if(!c.clientId)throw new Error('Escriba el Client ID de la aplicación Microsoft.');
    const verifier=randomString(64),state=randomString(24),codeChallenge=await challenge(verifier);
    sessionStorage.setItem(PKCE_KEY,JSON.stringify({verifier,state,returnHash:location.hash||'#settings',createdAt:Date.now()}));
    const q=new URLSearchParams({client_id:c.clientId,response_type:'code',redirect_uri:c.redirectUri,response_mode:'query',scope:c.scopes.join(' '),state,code_challenge:codeChallenge,code_challenge_method:'S256',prompt:'select_account'});
    location.assign(`${authority(c)}/authorize?${q}`);
  },
  disconnect(){saveToken(null);sessionStorage.removeItem(PKCE_KEY)},
  async accessToken(){
    const c=config(),t=tokenStore();if(!t)throw new Error('Conecte una cuenta Microsoft.');
    if(t.access_token&&Number(t.expires_at||0)>Math.floor(Date.now()/1000)+90)return t.access_token;
    if(!t.refresh_token)throw new Error('La sesión Microsoft venció. Vuelva a conectar.');
    const next=await tokenRequest({client_id:c.clientId,scope:c.scopes.join(' '),refresh_token:t.refresh_token,grant_type:'refresh_token'},c);
    if(!next.refresh_token)next.refresh_token=t.refresh_token;saveToken(next);return next.access_token;
  },
  async rawFetch(path,options={}){
    const token=await this.accessToken();
    return fetch(path.startsWith('http')?path:`${GRAPH_ROOT}${path}`,{...options,headers:{Authorization:`Bearer ${token}`,...(options.headers||{})}});
  },
  async fetch(path,options={}){
    const r=await this.rawFetch(path,options);
    if(!r.ok){const text=await r.text().catch(()=>''),d=(()=>{try{return text?JSON.parse(text):{}}catch{return{}}})();throw new Error(d.error?.message||d.error_description||text||`Microsoft Graph respondió ${r.status}.`)}return r;
  },
  async test(){const r=await this.fetch('/me?$select=id,displayName,mail,userPrincipalName');return r.json()},
  async itemByPath(path){
    const clean=encodePath(path);if(!clean)return{id:'root',name:'root',folder:{}};
    const r=await this.rawFetch(`/me/drive/root:/${clean}?$select=id,name,folder`);
    if(r.status===404)return null;
    if(!r.ok){const d=await r.json().catch(()=>({}));throw new Error(d.error?.message||`No se pudo consultar la carpeta de OneDrive (${r.status}).`)}
    return r.json();
  },
  async ensureFolder(path){
    const parts=String(path||'').split('/').map(x=>x.trim()).filter(Boolean);
    if(!parts.length)return{id:'root',name:'root',folder:{}};
    let parent={id:'root'},current='';
    for(const name of parts){
      current=current?`${current}/${name}`:name;
      let item=await this.itemByPath(current);
      if(!item){
        const endpoint=parent.id==='root'?'/me/drive/root/children':`/me/drive/items/${encodeURIComponent(parent.id)}/children`;
        const r=await this.rawFetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,folder:{},'@microsoft.graph.conflictBehavior':'fail'})});
        if(r.status===409)item=await this.itemByPath(current);
        else if(r.ok)item=await r.json();
        else{const d=await r.json().catch(()=>({}));throw new Error(d.error?.message||`No se pudo crear la carpeta “${name}” en OneDrive.`)}
      }
      if(!item?.id||!item.folder)throw new Error(`“${current}” existe en OneDrive, pero no es una carpeta.`);
      parent=item;
    }
    return parent;
  },
  async uploadFile(folder,filename,blob){
    if(!blob)throw new Error('No se encontró el archivo local.');
    if(blob.size>250*1024*1024)throw new Error(`${filename} supera 250 MB; requiere carga por sesiones.`);
    const c=config(),parent=await this.ensureFolder([c.driveFolder,folder].filter(Boolean).join('/')),name=safeFilename(filename);
    const r=await this.fetch(`/me/drive/items/${encodeURIComponent(parent.id)}:/${encodeURIComponent(name)}:/content`,{method:'PUT',headers:{'Content-Type':blob.type||'application/octet-stream'},body:blob});return r.json();
  },
  async sendMail({to,subject,html,saveToSentItems=true}){
    const recipients=String(to||'').split(/[;,]/).map(x=>x.trim()).filter(Boolean).map(address=>({emailAddress:{address}}));
    if(!recipients.length)throw new Error('Configure al menos un correo de notificación.');
    await this.fetch('/me/sendMail',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:{subject:subject||'SKC Facturas',body:{contentType:'HTML',content:html||''},toRecipients:recipients},saveToSentItems})});return true;
  }
};
