import assert from 'node:assert/strict';

globalThis.document={visibilityState:'visible'};
const {normalizeSupabaseUrl,SupabaseSync}=await import('../docs/assets/sync.js');
const {store}=await import('../docs/assets/store.js');

assert.equal(normalizeSupabaseUrl('https://abc.supabase.co/rest/v1/'),'https://abc.supabase.co');
assert.equal(normalizeSupabaseUrl('abc.supabase.co/auth/v1'),'https://abc.supabase.co');
assert.equal(normalizeSupabaseUrl('https://abc.supabase.co'),'https://abc.supabase.co');

store.settings.sync={provider:'supabase',supabaseUrl:'https://abc.supabase.co',anonKey:'sb_publishable_test',pollSeconds:20,auto:false,lockUserToEmail:true};
const failed=new SupabaseSync();
failed.pull=async()=>{throw new Error('red caída')};
const statuses=[];failed.addEventListener('status',e=>statuses.push(e.detail));
await assert.rejects(()=>failed.syncNow(),/red caída/);
assert.equal(failed.running,false);assert.equal(statuses.at(-1).running,false);assert.match(statuses.at(-1).message,/red caída/);

const pager=new SupabaseSync();
let calls=0,merged=0;
const originalMerge=store.mergeRemote.bind(store),originalReload=store.reload.bind(store);
store.mergeRemote=async()=>{merged+=1;return true};store.reload=async()=>{};
pager.apiFetch=async path=>{
  calls+=1;const offset=Number(new URL(`https://x${path}`).searchParams.get('offset')||0);
  const count=offset===0?1000:1;
  return new Response(JSON.stringify(Array.from({length:count},(_,i)=>({entity_type:'transactions',payload:{id:`${offset+i}`,updatedAt:'2026-08-07T00:00:00.000Z'}}))),{status:200,headers:{'Content-Type':'application/json'}});
};
assert.equal(await pager.pull(),1001);assert.equal(calls,2);assert.equal(merged,1001);
store.mergeRemote=originalMerge;store.reload=originalReload;
console.log('SYNC SMOKE OK',{pages:calls,rows:merged});

// A failed parent entity must not publish a dependent ledger entry, otherwise the shared flow
// could change without the source transaction/message being available on other devices.
const dependencySync=new SupabaseSync();
const originalPending=store.pendingEntities.bind(store),originalMarkError=store.markSyncError.bind(store),originalStoreReload=store.reload.bind(store);
let ledgerAttempted=false;
store.pendingEntities=async()=>[
  {type:'transactions',value:{id:'tx-fail'}},
  {type:'ledger',value:{id:'ledger-fail',sourceType:'FORMULARIO',sourceId:'tx-fail'}}
];
store.markSyncError=async()=>{};store.reload=async()=>{};
dependencySync.pushEntity=async(type)=>{if(type==='transactions')throw new Error('fallo de evidencia');if(type==='ledger')ledgerAttempted=true};
const dependencyResult=await dependencySync.push();
assert.equal(ledgerAttempted,false);assert.equal(dependencyResult.sent,0);assert.equal(dependencyResult.errors.length,2);assert.match(dependencyResult.errors[1],/Dependencia transactions:tx-fail/);
store.pendingEntities=originalPending;store.markSyncError=originalMarkError;store.reload=originalStoreReload;
console.log('SYNC DEPENDENCY GUARD SMOKE OK');
