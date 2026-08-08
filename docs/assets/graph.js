import {store} from './store.js';
import {cleanText,safeFilename} from './utils.js';

const TOKEN_KEY='skcGraphToken';
const PKCE_KEY='skcGraphPkce';
const GRAPH_ROOT='https://graph.microsoft.com/v1.0';
const PKCE_MAX_AGE_MS=15*60*1000;
const textEncoder=new TextEncoder();

const b64url=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const randomString=(length=64)=>{const bytes=new Uint8Array(length);crypto.getRandomValues(bytes);return b64url(bytes)};
async function challenge(verifier){return b64url(new Uint8Array(await crypto.subtle.digest('SHA-256',textEncoder.encode(verifier))))}
function tokenStore(){try{return JSON.parse(sessionStorage.getItem(TOKEN_KEY)||'null')}catch{return null}}
function saveToken(token){
  if(!token){sessionStorage.removeItem(TOKEN_KEY);return}
  const now=Math.floor(Date.now()/1000);
  sessionStorage.setItem(TOKEN_KEY,JSON.stringify({...token,expires_at:Number(token.expires_at||now+Number(token.expires_in||3600))}));
}

export function normalizeGraphScopes(scopes,sendOutlook=false){
  const base=['openid','profile','offline_access','User.Read','Files.ReadWrite'];
  const values=Array.isArray(scopes)&&scopes.length?scopes:base;
  const seen=new Set(),out=[];
  for(const scope of [...base,...values]){
    const value=cleanText(scope);
    if(!value||seen.has(value.toLowerCase())||(!sendOutlook&&value.toLowerCase()==='mail.send'))continue;
    seen.add(value.toLowerCase());out.push(value);
  }
  if(sendOutlook&&!seen.has('mail.send'))out.push('Mail.Send');
  return out;
}

function config(){
  const c=store.settings.integrations?.microsoft||{};
  const redirectUri=c.redirectUri&&c.redirectUri!=='auto'?c.redirectUri:`${location.origin}${location.pathname}`;
  const sendOutlook=Boolean(c.sendOutlook);
  return{
    enabled:Boolean(c.enabled),
    tenantId:cleanText(c.tenantId)||'common',
    clientId:cleanText(c.clientId),
    redirectUri,
    scopes:normalizeGraphScopes(c.scopes,sendOutlook),
    driveFolder:cleanText(c.driveFolder)||'SKC Facturas',
    uploadEvidence:c.uploadEvidence!==false,
    sendOutlook,
    notifyEmail:cleanText(c.notifyEmail)
  };
}

function authority(c=config()){return`https://login.microsoftonline.com/${encodeURIComponent(c.tenantId)}/oauth2/v2.0`}

async function tokenRequest(params,c=config()){
  const response=await fetch(`${authority(c)}/token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(params)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error_description||data.error||`Microsoft respondió ${response.status}.`);
  saveToken(data);return data;
}

function cleanAuthQuery(returnHash=''){
  const url=new URL(location.href);
  for(const key of['code','state','session_state','error','error_description'])url.searchParams.delete(key);
  const next=`${url.pathname}${url.search}${returnHash||url.hash||'#home'}`;
  history.replaceState(null,'',next);
}

function encodePath(path){return String(path||'').split('/').filter(Boolean).map(encodeURIComponent).join('/')}

function graphUrl(path){
  if(!String(path).startsWith('http'))return`${GRAPH_ROOT}${path}`;
  const url=new URL(path);
  if(url.origin!=='https://graph.microsoft.com')throw new Error('Microsoft Graph bloqueó una URL externa no permitida.');
  return url.href;
}

export const graph={
  config,
  isConfigured(){const c=config();return c.enabled&&Boolean(c.clientId&&c.tenantId)},
  isConnected(){const token=tokenStore();return Boolean(token?.access_token||token?.refresh_token)},

  async handleRedirectCallback(){
    const url=new URL(location.href),authCode=url.searchParams.get('code'),state=url.searchParams.get('state'),error=url.searchParams.get('error');
    if(!authCode&&!error)return false;
    let pkce=null;
    try{pkce=JSON.parse(sessionStorage.getItem(PKCE_KEY)||'null')}catch{}
    if(error){const message=url.searchParams.get('error_description')||error;sessionStorage.removeItem(PKCE_KEY);cleanAuthQuery(pkce?.returnHash);throw new Error(message)}
    const invalid=!pkce||pkce.state!==state||!pkce.verifier||Date.now()-Number(pkce.createdAt||0)>PKCE_MAX_AGE_MS;
    if(invalid){sessionStorage.removeItem(PKCE_KEY);cleanAuthQuery(pkce?.returnHash||'#settings');throw new Error('La respuesta de Microsoft no coincide con esta sesión o expiró. Vuelva a conectar.')}
    const c=config();
    await tokenRequest({client_id:c.clientId,scope:c.scopes.join(' '),code:authCode,redirect_uri:c.redirectUri,grant_type:'authorization_code',code_verifier:pkce.verifier},c);
    sessionStorage.removeItem(PKCE_KEY);cleanAuthQuery(pkce.returnHash);return true;
  },

  async connect(){
    const c=config();
    if(!c.enabled)throw new Error('Active Microsoft Graph antes de conectar la cuenta.');
    if(!c.clientId)throw new Error('Escriba el Client ID de la aplicación Microsoft.');
    const verifier=randomString(64),state=randomString(24),codeChallenge=await challenge(verifier);
    sessionStorage.setItem(PKCE_KEY,JSON.stringify({verifier,state,returnHash:location.hash||'#settings',createdAt:Date.now()}));
    const query=new URLSearchParams({client_id:c.clientId,response_type:'code',redirect_uri:c.redirectUri,response_mode:'query',scope:c.scopes.join(' '),state,code_challenge:codeChallenge,code_challenge_method:'S256',prompt:'select_account'});
    location.assign(`${authority(c)}/authorize?${query}`);
  },

  disconnect(){saveToken(null);sessionStorage.removeItem(PKCE_KEY)},

  async accessToken(){
    const c=config(),token=tokenStore();
    if(!token)throw new Error('Conecte una cuenta Microsoft.');
    if(token.access_token&&Number(token.expires_at||0)>Math.floor(Date.now()/1000)+90)return token.access_token;
    if(!token.refresh_token)throw new Error('La sesión Microsoft venció. Vuelva a conectar.');
    const next=await tokenRequest({client_id:c.clientId,scope:c.scopes.join(' '),refresh_token:token.refresh_token,grant_type:'refresh_token'},c);
    if(!next.refresh_token)next.refresh_token=token.refresh_token;
    saveToken(next);return next.access_token;
  },

  async rawFetch(path,options={}){
    const token=await this.accessToken();
    return fetch(graphUrl(path),{...options,headers:{Authorization:`Bearer ${token}`,...(options.headers||{})}});
  },

  async fetch(path,options={}){
    const response=await this.rawFetch(path,options);
    if(!response.ok){
      const text=await response.text().catch(()=>''),data=(()=>{try{return text?JSON.parse(text):{}}catch{return{}}})();
      throw new Error(data.error?.message||data.error_description||text||`Microsoft Graph respondió ${response.status}.`);
    }
    return response;
  },

  async test(){const response=await this.fetch('/me?$select=id,displayName,mail,userPrincipalName');return response.json()},

  async itemByPath(path){
    const clean=encodePath(path);if(!clean)return{id:'root',name:'root',folder:{}};
    const response=await this.rawFetch(`/me/drive/root:/${clean}?$select=id,name,folder`);
    if(response.status===404)return null;
    if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error?.message||`No se pudo consultar la carpeta de OneDrive (${response.status}).`)}
    return response.json();
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
        const response=await this.rawFetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,folder:{},'@microsoft.graph.conflictBehavior':'fail'})});
        if(response.status===409)item=await this.itemByPath(current);
        else if(response.ok)item=await response.json();
        else{const data=await response.json().catch(()=>({}));throw new Error(data.error?.message||`No se pudo crear la carpeta “${name}” en OneDrive.`)}
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
    const response=await this.fetch(`/me/drive/items/${encodeURIComponent(parent.id)}:/${encodeURIComponent(name)}:/content`,{method:'PUT',headers:{'Content-Type':blob.type||'application/octet-stream'},body:blob});
    return response.json();
  },

  async sendMail({to,subject,html,saveToSentItems=true}){
    const c=config();
    if(!c.sendOutlook)throw new Error('Active “Enviar avisos por Outlook” antes de enviar correos.');
    const recipients=String(to||'').split(/[;,]/).map(x=>x.trim()).filter(Boolean).map(address=>({emailAddress:{address}}));
    if(!recipients.length)throw new Error('Configure al menos un correo de notificación.');
    await this.fetch('/me/sendMail',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:{subject:subject||'SKC Facturas',body:{contentType:'HTML',content:html||''},toRecipients:recipients},saveToSentItems})});
    return true;
  }
};
