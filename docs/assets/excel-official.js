import {store} from './store.js';
import {graph} from './graph.js';
import {buildXlsxBlob} from './excel-writer.js';
import {safeFilename} from './utils.js';

const MONTHS=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
export const OFFICIAL_EXCEL_HEADERS=['FECHA','','','','','','DESCRIPCIÓN','PROYECTO2','Centro Costos','C Costos secundarios','Cliente','Factura','INGRESO','EGRESO','RESPONSABLE','GRUPO','OBSERVACIONES'];
const OFFICIAL_EXCEL_WIDTHS=[12,4,8,12,4,10,46,48,18,24,30,15,13,13,18,16,42];
let activeOneDriveUpload=null;

function cfg(){
  const c=store.settings.integrations?.excel||{};
  const filename=safeFilename(c.filename||'SKC_Registro_Oficial.xlsx');
  return{
    enabled:c.enabled!==false,
    filename:/\.xlsx$/i.test(filename)?filename:`${filename}.xlsx`,
    sheetName:String(c.sheetName||'REGISTRO').replace(/[\\/?*\[\]:]/g,' ').trim().slice(0,31)||'REGISTRO',
    onlySynced:Boolean(c.onlySynced),
    oneDriveFolder:String(c.oneDriveFolder||'Excel oficial').trim()||'Excel oficial',
    autoUpload:Boolean(c.autoUpload)
  };
}

export function isoWeek(dateString){
  const value=String(dateString||'');
  const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if(!match)return'';
  const x=new Date(Date.UTC(Number(match[1]),Number(match[2])-1,Number(match[3])));
  if(Number.isNaN(x.getTime()))return'';
  x.setUTCDate(x.getUTCDate()+4-(x.getUTCDay()||7));
  const yearStart=new Date(Date.UTC(x.getUTCFullYear(),0,1));
  return Math.ceil((((x-yearStart)/86400000)+1)/7);
}

function monthName(value){
  const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value||''));
  if(!match)return'';
  return MONTHS[Number(match[2])-1]||'';
}

function category(transaction){
  const explicit=String(transaction.excelCategory||transaction.category||'').trim();
  if(explicit)return explicit;
  const text=`${transaction.descriptionBase||''} ${transaction.description||''}`.toLowerCase();
  return /almuerzo|refrigerio|agua|bebida|aliment|comida/.test(text)?'Alim':'';
}

export function transactionToOfficialRow(transaction,groupName='PROYECTOS'){
  const amount=Number(transaction.amount||0);
  const validAmount=Number.isFinite(amount)?amount:0;
  const income=transaction.movementType==='Ingreso'?validAmount:null;
  const expense=transaction.movementType==='Gasto'?validAmount:null;
  return[
    transaction.purchaseDate||'',
    '#',
    isoWeek(transaction.purchaseDate)||'',
    monthName(transaction.purchaseDate),
    '',
    category(transaction),
    transaction.description||'',
    transaction.project||'',
    transaction.costCenter||'',
    transaction.secondaryCost||'',
    transaction.client||'',
    transaction.invoiceNumber||'',
    income,
    expense,
    transaction.accountUsername||transaction.username||'',
    transaction.groupName||groupName||'PROYECTOS',
    transaction.observations||''
  ];
}

export function officialRows(transactions=store.state.transactions,config=cfg()){
  return transactions
    .filter(t=>!config.onlySynced||t.syncStatus==='SINCRONIZADO')
    .slice()
    .sort((a,b)=>String(a.purchaseDate||a.createdAt||'').localeCompare(String(b.purchaseDate||b.createdAt||'')))
    .map(t=>transactionToOfficialRow(t,store.settings.groupName));
}

async function blob(){
  const c=cfg();
  return buildXlsxBlob({
    sheetName:c.sheetName,
    headers:OFFICIAL_EXCEL_HEADERS,
    rows:officialRows(store.state.transactions,c),
    widths:OFFICIAL_EXCEL_WIDTHS,
    dateColumns:[0],
    currencyColumns:[12,13],
    createdAt:new Date().toISOString()
  });
}

function download(blobValue,name){
  const url=URL.createObjectURL(blobValue),link=document.createElement('a');
  link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),5000);
}

export const officialExcel={
  config:cfg,
  createBlob:blob,
  async download(){const b=await blob(),name=cfg().filename;download(b,name);return{name,size:b.size}},
  async uploadToOneDrive(){
    if(!store.isAdmin())throw new Error('Solo un administrador puede actualizar el Excel oficial en OneDrive.');
    if(!graph.isConnected())throw new Error('Conecte Microsoft Graph antes de subir el Excel a OneDrive.');
    const c=cfg(),b=await blob();
    return graph.uploadFile(c.oneDriveFolder,c.filename,b);
  },
  async autoUpload(){
    const c=cfg();
    if(!c.enabled||!c.autoUpload||!graph.isConnected()||!store.isAdmin())return{skipped:true};
    if(activeOneDriveUpload)return activeOneDriveUpload;
    activeOneDriveUpload=(async()=>{const item=await this.uploadToOneDrive();return{skipped:false,item}})();
    try{return await activeOneDriveUpload}finally{activeOneDriveUpload=null}
  }
};
