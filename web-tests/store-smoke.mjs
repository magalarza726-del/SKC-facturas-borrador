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
await store.initialize();
assert.equal(store.currentUser().role,'ADMIN');
const demo=store.currentUser();
const karen=await store.saveUser({name:'Karen',email:'karen@example.com',role:'USUARIO',transferEnabled:true,initialBalance:0,active:true});
assert.equal(store.users().length,2);

const expense=await store.createTransaction({
  amount:10,movementType:'Gasto',accountUserId:demo.id,purchaseDate:'2026-07-28',
  evidenceStatus:'Compra sin comprobante',project:'Construcción de cuarto de transformadores Valdez',
  costCenter:'Servicios',secondaryCost:'Insumos proyectos',description:'Compra de conectores',
  supplier:'',invoiceNumber:'',paymentMethod:'Efectivo',client:'',observations:''
});
assert.ok(expense.code.startsWith('SKC-'));
assert.equal(store.balances().find(x=>x.user.id===demo.id).balance,-10);

await store.createTransaction({
  amount:12,movementType:'Gasto',accountUserId:demo.id,purchaseDate:'2026-07-28',
  evidenceStatus:'Comprobante adjunto',project:'Construcción de cuarto de transformadores Valdez',
  costCenter:'Servicios',secondaryCost:'Insumos proyectos',description:'Compra de terminales',
  supplier:'Proveedor Uno',invoiceNumber:'F-001',paymentMethod:'Efectivo',client:'',observations:''
});
const dup=await store.duplicateCandidates({amount:12,purchaseDate:'2026-07-28',description:'Compra de terminales',supplier:'Proveedor Uno',invoiceNumber:'F-001',evidenceStatus:'Comprobante adjunto'},[]);
assert.equal(dup.exact.length,1);

const reminder=await store.createReminder('Registrar almuerzo de cuadrilla');
assert.equal(reminder.status,'PENDIENTE');

const transfer=await store.createTransferMessage({recipientUserId:karen.id,amount:25,reason:'Reembolso de compra en sitio',project:'Proyecto Valdez',reference:'ABC-25',transferDate:'2026-07-28'},[]);
assert.equal(transfer.status,'ENVIADO');
await store.setCurrentUser(karen.id);
await store.confirmTransfer(transfer.id);
assert.equal(store.balances().find(x=>x.user.id===karen.id).balance,25);
assert.equal(store.state.messages.find(x=>x.id===transfer.id).status,'CONFIRMADO');

const snapshot=await store.exportSnapshot(false);
assert.equal(snapshot.format,'skc-facturas-web-backup');
assert.ok(snapshot.entities.length>=10);
console.log('WEB STORE SMOKE OK', {users:store.state.users.length,transactions:store.state.transactions.length,messages:store.state.messages.length,ledger:store.state.ledger.length});
