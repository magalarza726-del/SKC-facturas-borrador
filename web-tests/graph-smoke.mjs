import assert from 'node:assert/strict';
class Storage{constructor(){this.m=new Map()}getItem(k){return this.m.has(k)?this.m.get(k):null}setItem(k,v){this.m.set(k,String(v))}removeItem(k){this.m.delete(k)}}
globalThis.sessionStorage=new Storage();
let assigned='';
globalThis.location={origin:'https://magalarza726-del.github.io',pathname:'/SKC-facturas-borrador/',hash:'#settings',search:'',href:'https://magalarza726-del.github.io/SKC-facturas-borrador/#settings',assign:v=>{assigned=v}};
let replaced='';globalThis.history={replaceState:(_a,_b,v)=>{replaced=v}};
const {store}=await import('../docs/assets/store.js');
store.settings.integrations.microsoft={enabled:true,tenantId:'tenant-id',clientId:'client-id',redirectUri:'auto',scopes:['openid','profile','offline_access','User.Read','Files.ReadWrite','Mail.Send'],driveFolder:'SKC Facturas',uploadEvidence:true};
const {graph}=await import('../docs/assets/graph.js');
assert.equal(graph.config().redirectUri,'https://magalarza726-del.github.io/SKC-facturas-borrador/');
assert.equal(graph.config().scopes.includes('Mail.Send'),false);
store.settings.integrations.microsoft.sendOutlook=true;assert.equal(graph.config().scopes.includes('Mail.Send'),true);store.settings.integrations.microsoft.sendOutlook=false;
await graph.connect();
const auth=new URL(assigned);assert.equal(auth.hostname,'login.microsoftonline.com');assert.equal(auth.searchParams.get('client_id'),'client-id');assert.equal(auth.searchParams.get('code_challenge_method'),'S256');assert.ok(auth.searchParams.get('code_challenge'));assert.equal(auth.searchParams.has('client_secret'),false);
const state=auth.searchParams.get('state');
location.href=`https://magalarza726-del.github.io/SKC-facturas-borrador/?code=auth-code&state=${state}`;location.search=`?code=auth-code&state=${state}`;location.hash='';
globalThis.fetch=async(url,opt)=>{assert.ok(String(url).endsWith('/token'));const body=new URLSearchParams(opt.body);assert.equal(body.get('grant_type'),'authorization_code');assert.equal(body.get('client_secret'),null);return new Response(JSON.stringify({access_token:'access',refresh_token:'refresh',expires_in:3600}),{status:200,headers:{'Content-Type':'application/json'}})};
assert.equal(await graph.handleRedirectCallback(),true);assert.equal(graph.isConnected(),true);assert.ok(replaced.includes('#settings'));
await assert.rejects(()=>graph.rawFetch('https://evil.example/steal'),/URL externa/i);
console.log('GRAPH PKCE + SCOPE + ORIGIN GUARD SMOKE OK');

const pathItems=new Map(),idPaths=new Map([['root','']]);let folderSeq=0,uploaded=false;
globalThis.fetch=async(url,opt={})=>{
  const u=String(url),method=opt.method||'GET';
  if(method==='GET'&&u.includes('/me/drive/root:/')){
    const encoded=u.split('/me/drive/root:/')[1].split('?$select')[0];
    const path=decodeURIComponent(encoded).replace(/%2F/gi,'/');
    const item=pathItems.get(path);
    return item?new Response(JSON.stringify(item),{status:200,headers:{'Content-Type':'application/json'}}):new Response(JSON.stringify({error:{message:'Not found'}}),{status:404,headers:{'Content-Type':'application/json'}});
  }
  if(method==='POST'&&(/\/me\/drive\/root\/children$/.test(u)||u.includes('/me/drive/items/'))){
    const body=JSON.parse(opt.body),parentId=/\/items\/([^/]+)\/children$/.exec(u)?.[1]||'root',parentPath=idPaths.get(decodeURIComponent(parentId))||'',path=parentPath?`${parentPath}/${body.name}`:body.name,id=`folder-${++folderSeq}`,item={id,name:body.name,folder:{}};
    pathItems.set(path,item);idPaths.set(id,path);
    return new Response(JSON.stringify(item),{status:201,headers:{'Content-Type':'application/json'}});
  }
  if(method==='PUT'&&u.includes('/content')){
    uploaded=true;assert.ok(u.includes('/me/drive/items/folder-4:'));assert.equal(opt.body.size,4);
    return new Response(JSON.stringify({id:'file-1',name:'factura.pdf',size:4,webUrl:'https://onedrive/item'}),{status:201,headers:{'Content-Type':'application/json'}});
  }
  throw new Error(`Unexpected Graph request: ${method} ${u}`);
};
const item=await graph.uploadFile('Facturas/2026-07-29/SKC-001','factura.pdf',new Blob(['test'],{type:'application/pdf'}));
assert.equal(item.id,'file-1');assert.equal(uploaded,true);assert.equal(pathItems.size,4);
console.log('GRAPH FOLDER + UPLOAD SMOKE OK');
