import {cleanText,todayIso} from './utils.js';

export const FORM_SCHEMAS={
  invoice:{label:'Factura / compra',fields:[
    {id:'movementType',label:'Tipo de movimiento',core:true,visible:true,required:true,defaultValue:'Gasto'},
    {id:'amount',label:'Monto',core:true,visible:true,required:true,defaultValue:''},
    {id:'accountUserId',label:'Responsable del saldo',core:true,visible:true,required:true,defaultValue:'@currentUser'},
    {id:'purchaseDate',label:'Fecha',core:true,visible:true,required:true,defaultValue:'@today'},
    {id:'descriptionBase',label:'Descripción base',core:true,visible:true,required:true,defaultValue:''},
    {id:'project',label:'Proyecto 2',core:true,visible:true,required:true,defaultValue:''},
    {id:'description',label:'Detalle de la compra',core:true,visible:true,required:true,defaultValue:''},
    {id:'evidenceStatus',label:'Estado de evidencia',visible:true,required:false,defaultValue:'@normalEvidence'},
    {id:'supplier',label:'Proveedor',visible:true,required:false,defaultValue:''},
    {id:'invoiceNumber',label:'Número de factura',visible:true,required:false,defaultValue:''},
    {id:'attachments',label:'Evidencias',visible:true,required:false,defaultValue:''},
    {id:'costCenter',label:'Centro de costo',visible:false,required:false,defaultValue:'@firstCostCenter'},
    {id:'secondaryCost',label:'Costo secundario',visible:false,required:false,defaultValue:'@firstSecondaryCost'},
    {id:'client',label:'Cliente',visible:false,required:false,defaultValue:''},
    {id:'paymentMethod',label:'Método de pago',visible:false,required:false,defaultValue:'@firstPaymentMethod'},
    {id:'observations',label:'Observaciones',visible:false,required:false,defaultValue:''},
    {id:'recentRecords',label:'Últimos registros',visible:true,required:false,defaultValue:''}
  ]},
  fundRequest:{label:'Solicitud de monto',fields:[
    {id:'amount',label:'Monto solicitado',core:true,visible:true,required:true,defaultValue:''},
    {id:'recipientUserId',label:'Destinatario',visible:true,required:false,defaultValue:''},
    {id:'project',label:'Proyecto',visible:true,required:false,defaultValue:''},
    {id:'reason',label:'Motivo',core:true,visible:true,required:true,defaultValue:''},
    {id:'balanceDeclared',label:'Saldo actual',visible:false,required:false,defaultValue:'@currentBalance'},
    {id:'recipientEmail',label:'Correo externo',visible:false,required:false,defaultValue:''}
  ]},
  transfer:{label:'Transferencia',fields:[
    {id:'amount',label:'Monto transferido',core:true,visible:true,required:true,defaultValue:''},
    {id:'recipientUserId',label:'Beneficiario',core:true,visible:true,required:true,defaultValue:''},
    {id:'transferDate',label:'Fecha',core:true,visible:true,required:true,defaultValue:'@today'},
    {id:'reason',label:'Concepto',core:true,visible:true,required:true,defaultValue:''},
    {id:'reference',label:'Referencia bancaria',visible:true,required:false,defaultValue:''},
    {id:'project',label:'Proyecto',visible:true,required:false,defaultValue:''},
    {id:'attachments',label:'Adjuntar evidencia',visible:true,required:false,defaultValue:''}
  ]},
  reminder:{label:'Recordatorio',fields:[
    {id:'reason',label:'¿Qué se compró o qué debes registrar?',core:true,visible:true,required:true,defaultValue:''}
  ]}
};

export function defaultFormLayouts(){
  const out={};
  for(const[module,schema]of Object.entries(FORM_SCHEMAS))out[module]=schema.fields.map((f,index)=>({id:f.id,label:f.label,visible:f.visible!==false,required:Boolean(f.required),defaultValue:f.defaultValue||'',order:index}));
  return out;
}

function mergeField(base,configured,index){
  const c=configured||{};
  return{
    ...base,
    label:cleanText(c.label)||base.label,
    visible:base.core?true:c.visible!==false,
    required:base.core&&base.required?true:(c.required!==undefined?Boolean(c.required):Boolean(base.required)),
    defaultValue:c.defaultValue!==undefined?String(c.defaultValue):String(base.defaultValue||''),
    order:Number.isFinite(Number(c.order))?Number(c.order):index
  };
}

export function getFormLayout(settings,module){
  const schema=FORM_SCHEMAS[module];if(!schema)return[];
  const configured=Array.isArray(settings?.forms?.[module])?settings.forms[module]:[];
  const byId=new Map(configured.map(x=>[x.id,x]));
  return schema.fields.map((f,i)=>mergeField(f,byId.get(f.id),i)).sort((a,b)=>a.order-b.order||a.label.localeCompare(b.label,'es'));
}

export function getFieldConfig(settings,module,id){
  return getFormLayout(settings,module).find(x=>x.id===id)||null;
}
export const fieldVisible=(settings,module,id)=>getFieldConfig(settings,module,id)?.visible!==false;
export const fieldRequired=(settings,module,id)=>Boolean(getFieldConfig(settings,module,id)?.required);
export const fieldLabel=(settings,module,id,fallback='')=>getFieldConfig(settings,module,id)?.label||fallback||id;
export const fieldOrder=(settings,module,id)=>getFieldConfig(settings,module,id)?.order??999;

export function resolveDefault(token,ctx={}){
  const t=String(token??'');
  if(!t.startsWith('@'))return t;
  const c=ctx.catalogs||{},projects=c.projects||[],first=projects[0];
  const map={
    '@today':todayIso(),
    '@currentUser':ctx.currentUser?.id||'',
    '@firstProject':first?.id||'',
    '@firstProject2':first?.project2Options?.[0]||'',
    '@projectDescription':first?.description||'',
    '@normalEvidence':(c.evidenceStatuses||[]).map(x=>typeof x==='string'?x:(x.name||x.id||'')).find(x=>x&&!/sin comprobante/i.test(x))||(c.evidenceStatuses||[])[0]||'',
    '@firstCostCenter':(c.costCenters||[])[0]||'',
    '@firstSecondaryCost':(c.secondaryCosts||[])[0]||'',
    '@firstPaymentMethod':(c.paymentMethods||[])[0]||'',
    '@currentBalance':String(ctx.currentBalance??0)
  };
  return map[t]??'';
}

export function applyConfiguredDefaults(settings,module,values={},ctx={}){
  const out={...values};
  for(const f of getFormLayout(settings,module)){
    const current=out[f.id];
    if(current!==undefined&&current!==null&&String(current).trim()!=='')continue;
    const v=resolveDefault(f.defaultValue,ctx);
    if(v!==undefined&&v!==null&&String(v)!=='')out[f.id]=v;
  }
  return out;
}

export function validateConfigurableRequired(settings,module,values={}){
  for(const f of getFormLayout(settings,module)){
    if(!f.required)continue;
    const v=values[f.id];
    if(v===undefined||v===null||String(v).trim()==='')throw new Error(`${f.label} es obligatorio.`);
  }
}

export function fieldContainer(settings,module,id,html,className='field'){
  const f=getFieldConfig(settings,module,id);if(!f?.visible)return'';
  return`<div class="${className}" data-config-field="${id}" style="order:${f.order}">${html}</div>`;
}

export function applyFormLayout(root,settings,module,map={}){
  const layout=getFormLayout(settings,module);
  for(const f of layout){
    const entry=map[f.id];if(!entry)continue;
    const elements=[...(typeof entry==='string'?root.querySelectorAll(entry):entry.elements?root.querySelectorAll(entry.elements):[])];
    const anchor=entry.container?root.querySelector(entry.container):elements[0]?.closest?.('.field,.mobile-field,.mobile-toggle-row,.mobile-form-section,.config-field')||null;
    if(anchor){anchor.dataset.configField=f.id;anchor.style.order=String(f.order);anchor.hidden=!f.visible;anchor.classList.toggle('config-field-hidden',!f.visible)}
    const label=entry.label?root.querySelector(entry.label):anchor?.querySelector?.('label');
    if(label&&f.label){const textNode=[...label.childNodes].find(n=>n.nodeType===Node.TEXT_NODE);if(textNode)textNode.textContent=f.label;else label.prepend(document.createTextNode(f.label))}
    for(const el of elements){if(['INPUT','SELECT','TEXTAREA'].includes(el.tagName)&&!['radio','checkbox','file','hidden'].includes(el.type)){if(f.required)el.setAttribute('required','');else el.removeAttribute('required')}el.dataset.configField=f.id}
  }
  for(const parent of new Set(layout.map(f=>{const entry=map[f.id];if(!entry)return null;const els=[...(typeof entry==='string'?root.querySelectorAll(entry):entry.elements?root.querySelectorAll(entry.elements):[])];return(entry.container?root.querySelector(entry.container):els[0]?.closest?.('.field,.mobile-field,.mobile-toggle-row,.mobile-form-section,.config-field'))?.parentElement||null}).filter(Boolean))){
    const nodes=[...parent.children].filter(x=>x.dataset?.configField);nodes.sort((a,b)=>Number(a.style.order||999)-Number(b.style.order||999));for(const n of nodes)parent.append(n)
  }
  return layout;
}
