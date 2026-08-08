import assert from 'node:assert/strict';

const clone=v=>v===undefined?v:structuredClone(v);
class FakeStoreData{constructor(keyPath){this.keyPath=keyPath;this.rows=new Map()}}
class FakeRequest{constructor(){this.result=undefined;this.error=null;this.onsuccess=null;this.onerror=null;this.onupgradeneeded=null}}
class FakeTransaction{
  constructor(db,names){this.db=db;this.names=Array.isArray(names)?names:[names];this.pending=0;this.closed=false;this.oncomplete=null;this.onerror=null;this.onabort=null;this.error=null}
  objectStore(name){if(!this.names.includes(name))throw new Error(`Store ${name} is not in this transaction`);return new FakeObjectStore(this,this.db.stores.get(name),name)}
  start(){this.pending++}
  finish(){this.pending--;if(this.pending===0&&!this.closed){this.closed=true;setTimeout(()=>this.oncomplete?.({target:this}),0)}}
}
function request(tx,fn){const r=new FakeRequest();tx.start();queueMicrotask(()=>{try{r.result=clone(fn());r.onsuccess?.({target:r})}catch(e){r.error=e;tx.error=e;r.onerror?.({target:r});tx.onerror?.({target:tx})}finally{tx.finish()}});return r}
class FakeIndex{constructor(tx,data,property){this.tx=tx;this.data=data;this.property=property}getAll(value){return request(this.tx,()=>[...this.data.rows.values()].filter(x=>x?.[this.property]===value))}}
class FakeObjectStore{
  constructor(tx,data,name){this.tx=tx;this.data=data;this.name=name}
  createIndex(){return this}
  put(value){return request(this.tx,()=>{const k=value[this.data.keyPath];if(k===undefined)throw new Error(`Missing keyPath ${this.data.keyPath}`);this.data.rows.set(k,clone(value));return k})}
  get(key){return request(this.tx,()=>this.data.rows.get(key))}
  getAll(){return request(this.tx,()=>[...this.data.rows.values()])}
  clear(){return request(this.tx,()=>{this.data.rows.clear()})}
  index(name){return new FakeIndex(this.tx,this.data,name)}
}
class FakeDatabase{
  constructor(){this.stores=new Map();this.onversionchange=null;this.objectStoreNames={contains:n=>this.stores.has(n)}}
  createObjectStore(name,{keyPath}){const data=new FakeStoreData(keyPath);this.stores.set(name,data);return {createIndex(){}}
  }
  transaction(names){return new FakeTransaction(this,names)}
  close(){}
}
class FakeIndexedDB{
  constructor(){this.databases=new Map()}
  open(name){const r=new FakeRequest();setTimeout(()=>{try{let db=this.databases.get(name);const fresh=!db;if(!db){db=new FakeDatabase();this.databases.set(name,db)}r.result=db;if(fresh)r.onupgradeneeded?.({target:r});r.onsuccess?.({target:r})}catch(e){r.error=e;r.onerror?.({target:r})}},0);return r}
}
globalThis.indexedDB=new FakeIndexedDB();

const {store}=await import('../docs/assets/store.js');
const {db}=await import('../docs/assets/db.js');
await store.initialize();
assert.equal(store.currentUser().role,'ADMIN');
const demo=store.currentUser();
const karen=await store.saveUser({name:'Karen',email:'karen@example.com',role:'USUARIO',transferEnabled:true,initialBalance:0,active:true});
assert.equal(store.users().length,2);

// A description/project can legitimately have no Proyecto 2 options. It must not disappear from the catalog.
await store.saveCatalogs({
  projects:[
    {description:'Proyecto sin subproyecto',project2Options:[]},
    {description:'Proyecto con subproyecto',project2Options:['Frente A']}
  ],
  costCenters:['Servicios'],secondaryCosts:['Insumos proyectos'],
  evidenceStatuses:['Comprobante adjunto','Compra sin comprobante'],paymentMethods:['Efectivo']
});
assert.equal(store.catalogs().projects.length,2);
assert.equal(store.catalogs().projects.find(x=>x.description==='Proyecto sin subproyecto')?.project2Options.length,0);

// Restore a representative catalog used by the rest of this smoke test.
await store.saveCatalogs({
  projects:[{description:'Mantenimiento y compra de insumos',project2Options:['Construcción de cuarto de transformadores Valdez','Plan de infraestructura mtto de extractores']}],
  costCenters:['Servicios'],secondaryCosts:['Insumos proyectos'],
  evidenceStatuses:['Comprobante adjunto','Compra sin comprobante'],paymentMethods:['Efectivo']
});

const expense=await store.createTransaction({
  amount:10,movementType:'Gasto',accountUserId:demo.id,purchaseDate:'2026-07-28',
  evidenceStatus:'Compra sin comprobante',descriptionBase:'Mantenimiento y compra de insumos',project:'Construcción de cuarto de transformadores Valdez',
  costCenter:'Servicios',secondaryCost:'Insumos proyectos',description:'Compra de conectores',
  supplier:'',invoiceNumber:'',paymentMethod:'Efectivo',client:'',observations:''
});
assert.ok(expense.code.startsWith('SKC-'));
assert.equal(expense.descriptionBase,'Mantenimiento y compra de insumos');
assert.equal(store.balances().find(x=>x.user.id===demo.id).balance,-10);
const baseById=store.catalogs().projects[0];
const byIdExpense=await store.createTransaction({amount:2,movementType:'Gasto',accountUserId:demo.id,purchaseDate:'2026-07-28',evidenceStatus:'Compra sin comprobante',descriptionBase:baseById.id,project:baseById.project2Options[0],description:'Prueba selección por ID'});
assert.equal(byIdExpense.descriptionBase,baseById.description);
assert.equal(byIdExpense.descriptionBaseId,baseById.id);

await store.createTransaction({
  amount:12,movementType:'Gasto',accountUserId:demo.id,purchaseDate:'2026-07-28',
  evidenceStatus:'Comprobante adjunto',descriptionBase:'Mantenimiento y compra de insumos',project:'Construcción de cuarto de transformadores Valdez',
  costCenter:'Servicios',secondaryCost:'Insumos proyectos',description:'Compra de terminales',
  supplier:'Proveedor Uno',invoiceNumber:'F-001',paymentMethod:'Efectivo',client:'',observations:''
});
const dup=await store.duplicateCandidates({amount:12,purchaseDate:'2026-07-28',description:'Compra de terminales',supplier:'Proveedor Uno',invoiceNumber:'F-001',evidenceStatus:'Comprobante adjunto'},[]);
assert.equal(dup.exact.length,1);
await assert.rejects(()=>store.createTransaction({amount:12,movementType:'Gasto',accountUserId:demo.id,purchaseDate:'2026-07-28',evidenceStatus:'Comprobante adjunto',descriptionBase:'Mantenimiento y compra de insumos',project:'Construcción de cuarto de transformadores Valdez',description:'Intento duplicado',supplier:'Proveedor Uno',invoiceNumber:'F-001'}),/ya fue registrada/i);
await assert.rejects(()=>store.createTransaction({amount:12,movementType:'Gasto',accountUserId:demo.id,purchaseDate:'2026-07-28',evidenceStatus:'Comprobante adjunto',descriptionBase:'Mantenimiento y compra de insumos',project:'Construcción de cuarto de transformadores Valdez',description:'Intento de bypass',supplier:'Proveedor Uno',invoiceNumber:'F-001',observations:'DUPLICADO REVISADO POR FALSO: texto manual'}),/ya fue registrada/i);
const reviewedDuplicate=await store.createTransaction({amount:12,movementType:'Gasto',accountUserId:demo.id,purchaseDate:'2026-07-28',evidenceStatus:'Comprobante adjunto',descriptionBase:'Mantenimiento y compra de insumos',project:'Construcción de cuarto de transformadores Valdez',description:'Duplicado revisado',supplier:'Proveedor Uno',invoiceNumber:'F-001',observations:'Observación normal'},[],{duplicateJustification:'Compra legítima repetida'});
assert.equal(reviewedDuplicate.reviewStatus,'DUPLICADO_REVISADO');
assert.equal(reviewedDuplicate.duplicateReview.justification,'Compra legítima repetida');
assert.match(reviewedDuplicate.observations,/DUPLICADO REVISADO POR/i);

await assert.rejects(()=>store.saveUser({name:'Saldo inválido',email:'saldo@example.com',role:'USUARIO',initialBalance:'abc',active:true}),/saldo inicial/i);

const attachmentTx=await store.createTransaction({
  amount:18,movementType:'Gasto',accountUserId:demo.id,purchaseDate:'2026-07-28',
  evidenceStatus:'Comprobante adjunto',descriptionBase:'Mantenimiento y compra de insumos',project:'Construcción de cuarto de transformadores Valdez',
  description:'Compra con evidencia',supplier:'Proveedor Dos',invoiceNumber:'F-002'
},[{id:'file-a',filename:'factura-a.pdf',mime:'application/pdf',size:10,sha256:'abc123',remotePath:''}]);
const hashDup=await store.duplicateCandidates({amount:999,purchaseDate:'2026-07-30',description:'Otro texto',supplier:'Otro',invoiceNumber:'OTRO',evidenceStatus:'Comprobante adjunto'},[{id:'file-b',sha256:'abc123'},{id:'file-c',sha256:'different'}]);
assert.ok(hashDup.exact.some(x=>x.id===attachmentTx.id));

const flexibleNoReceipt=await store.createTransaction({amount:4,movementType:'Gasto',accountUserId:demo.id,purchaseDate:'2026-07-28',evidenceStatus:'Sin comprobante',descriptionBase:'Mantenimiento y compra de insumos',project:'Construcción de cuarto de transformadores Valdez',description:'Agua',supplier:'Tienda local',invoiceNumber:''});
assert.equal(flexibleNoReceipt.supplier,'Tienda local');

await assert.rejects(()=>store.createFundMessage({recipientUserId:'missing-user',amount:5,reason:'Prueba'}),/destinatario válido/i);

const reminder=await store.createReminder('Registrar almuerzo de cuadrilla');
assert.equal(reminder.status,'PENDIENTE');

const transfer=await store.createTransferMessage({recipientUserId:karen.id,amount:25,reason:'Reembolso de compra en sitio',project:'Proyecto Valdez',reference:'ABC-25',transferDate:'2026-07-28'},[]);
assert.equal(transfer.status,'ENVIADO');
await store.setCurrentUser(karen.id);
await store.confirmTransfer(transfer.id);
assert.equal(store.balances().find(x=>x.user.id===karen.id).balance,25);
assert.equal(store.state.messages.find(x=>x.id===transfer.id).status,'CONFIRMADO');

await db.setMeta('supabaseSession',{access_token:'must-not-leave-browser',refresh_token:'also-private'});
const snapshot=await store.exportSnapshot(false);
assert.equal(snapshot.format,'skc-facturas-web-backup');
assert.ok(snapshot.entities.length>=10);
assert.equal(snapshot.meta.supabaseSession,undefined);
await store.saveSettings({sync:{anonKey:'DEVICE_KEY'}});
const mergeSnapshot=structuredClone(snapshot);mergeSnapshot.meta.settings.sync.anonKey='BACKUP_KEY';
await store.importSnapshot(mergeSnapshot,false);
assert.equal(store.settings.sync.anonKey,'DEVICE_KEY');
console.log('WEB STORE SMOKE OK', {users:store.state.users.length,transactions:store.state.transactions.length,messages:store.state.messages.length,ledger:store.state.ledger.length});

const simpleExpense=await store.createTransaction({amount:7.5,movementType:'Gasto',accountUserId:karen.id,purchaseDate:'2026-07-29',descriptionBase:'Mantenimiento y compra de insumos',project:'Plan de infraestructura mtto de extractores',description:'Almuerzo de trabajo',evidenceStatus:'Compra sin comprobante'});
assert.equal(simpleExpense.costCenter,'Servicios');
assert.equal(simpleExpense.secondaryCost,'Insumos proyectos');
await store.saveSettings({sync:{anonKey:'PUBLIC_ANON_TEST'},integrations:{microsoft:{enabled:true,tenantId:'tenant',clientId:'client'}}});
const portable=await store.exportConfiguration(false);
assert.equal(portable.format,'skc-app-configuration');
assert.equal(portable.settings.sync.anonKey,'PUBLIC_ANON_TEST');
assert.equal(portable.settings.profileUserId,undefined);
assert.equal(portable.settings.sync.lastSyncAt,undefined);
assert.equal(portable.settings.pilot,undefined);
assert.ok(Array.isArray(portable.settings.forms.invoice));
await store.setCurrentUser(demo.id);
await store.importConfiguration(portable);
assert.equal(store.settings.integrations.microsoft.clientId,'client');
const badSecret=structuredClone(portable);badSecret.settings.sync.anonKey='sb_secret_never-in-browser';
await assert.rejects(()=>store.importConfiguration(badSecret),/Secret key/i);
console.log('CONFIGURATION SMOKE OK', {forms:portable.settings.forms.invoice.length,microsoft:store.settings.integrations.microsoft.enabled});
const {sync}=await import('../docs/assets/sync.js');
await store.setCurrentUser(demo.id);
sync.activeSession={access_token:'test',user:{email:'karen@example.com'}};
await sync.bindSessionUser(sync.activeSession);
assert.equal(store.currentUser().id,karen.id);
assert.equal(sync.isUserLocked(),true);
assert.equal(sync.hasBoundIdentity(),true);
const originalKarenEmail=karen.email;store.userById(karen.id).email='changed@example.com';assert.equal(sync.hasBoundIdentity(),false);store.userById(karen.id).email=originalKarenEmail;assert.equal(sync.hasBoundIdentity(),true);
console.log('SESSION USER BINDING SMOKE OK', {user:store.currentUser().name});

const requiredFilesLayout=store.settings.forms.invoice.map(f=>f.id==='attachments'?{...f,required:true,visible:true}:f);
await assert.rejects(()=>store.saveSettings({forms:{invoice:requiredFilesLayout}}),/administrador/i);
await store.setCurrentUser(demo.id);
await store.saveSettings({forms:{invoice:requiredFilesLayout}});
assert.equal(store.state.appConfig.find(x=>x.id==='global')?.forms?.invoice?.find(x=>x.id==='attachments')?.required,true);
assert.ok((await store.pendingEntities()).some(x=>x.type==='appConfig'&&x.value.id==='global'));
const localShared=store.state.appConfig.find(x=>x.id==='global');
await store.mergeRemote('appConfig',{...localShared,groupName:'OPERACIONES',updatedAt:'2099-01-01T00:00:00.000Z',syncStatus:'SINCRONIZADO'});
await store.reload();
assert.equal(store.settings.groupName,'OPERACIONES');
console.log('SHARED FORM CONFIG SMOKE OK');
await assert.rejects(()=>store.createTransaction({amount:3,movementType:'Gasto',accountUserId:karen.id,purchaseDate:'2026-07-30',descriptionBase:'Mantenimiento y compra de insumos',project:'Plan de infraestructura mtto de extractores',description:'Prueba evidencia requerida',evidenceStatus:'Comprobante adjunto'}),/Evidencias es obligatorio/i);
const withRequiredFile=await store.createTransaction({amount:3,movementType:'Gasto',accountUserId:karen.id,purchaseDate:'2026-07-30',descriptionBase:'Mantenimiento y compra de insumos',project:'Plan de infraestructura mtto de extractores',description:'Prueba evidencia requerida',evidenceStatus:'Comprobante adjunto'},[{id:'required-file',filename:'evidencia.pdf',mime:'application/pdf',size:4,sha256:'required-sha',remotePath:''}]);
assert.equal(withRequiredFile.attachments.length,1);
console.log('CONFIGURABLE REQUIRED FILE SMOKE OK');
