import {store} from './store.js';
import {graph} from './graph.js';
import {sync} from './sync.js';
import {escapeHtml,money,nowIso} from './utils.js';
import {officialExcel} from './excel-official.js';

function telegramConfig(){const c=store.settings.integrations?.telegram||{};return{enabled:Boolean(c.enabled),mode:c.mode||'proxy',proxyUrl:String(c.proxyUrl||'').trim(),chatId:String(c.chatId||'').trim(),sendTransactions:c.sendTransactions!==false,sendTransfers:c.sendTransfers!==false}}
async function postTelegram(event,payload){
  const c=telegramConfig();if(!c.enabled)return{skipped:true};
  if(c.mode!=='proxy'||!c.proxyUrl)throw new Error('Telegram requiere una URL proxy segura.');
  const headers={'Content-Type':'application/json'},sc=sync.config();
  if(sc.url&&c.proxyUrl.startsWith(`${sc.url}/functions/v1/`)){
    const session=await sync.session();if(!session?.access_token)throw new Error('Inicie sesión en Supabase antes de usar el proxy de Telegram.');
    headers.apikey=sc.anonKey;headers.Authorization=`Bearer ${session.access_token}`;
  }
  const r=await fetch(c.proxyUrl,{method:'POST',headers,body:JSON.stringify({event,chatId:c.chatId,payload})});
  const d=await r.json().catch(()=>({}));if(!r.ok||d.ok===false)throw new Error(d.message||d.description||`Telegram proxy respondió ${r.status}.`);return d;
}
async function graphEvidence(folder,files=[]){
  const c=graph.config();if(!c.enabled||!c.uploadEvidence||!graph.isConnected()||!files.length)return[];
  const out=[];for(const f of files){const item=await graph.uploadFile(folder,f.filename,f.blob);out.push({id:item.id,name:item.name,webUrl:item.webUrl||'',size:item.size||f.size})}return out;
}
function linksHtml(items){return items.length?`<ul>${items.map(x=>`<li>${x.webUrl?`<a href="${escapeHtml(x.webUrl)}">${escapeHtml(x.name)}</a>`:escapeHtml(x.name)}</li>`).join('')}</ul>`:'<p>Sin evidencia cargada en OneDrive.</p>'}

export const integrations={
  async testTelegram(){return postTelegram('skc.integration.test',{message:'Prueba de conexión desde SKC Facturas',at:nowIso()})},
  async publishTransaction(record,files=[]){
    const result={microsoft:{status:'OMITIDO'},telegram:{status:'OMITIDO'},excel:{status:'OMITIDO'},updatedAt:nowIso()};
    const errors=[];let uploaded=[];
    const mc=graph.config();
    if(mc.enabled){
      try{
        if(!graph.isConnected())throw new Error('Microsoft está configurado pero no hay una sesión conectada.');
        uploaded=await graphEvidence(`Facturas/${record.purchaseDate}/${record.code}`,files);
        result.microsoft={status:'OK',files:uploaded,processedAt:nowIso()};
        if(mc.sendOutlook&&mc.notifyEmail){
          await graph.sendMail({to:mc.notifyEmail,subject:`SKC · ${record.code} · ${record.movementType} ${money(record.amount)}`,html:`<h2>Nuevo movimiento SKC</h2><p><strong>Código:</strong> ${escapeHtml(record.code)}</p><p><strong>Responsable:</strong> ${escapeHtml(record.accountUsername)}</p><p><strong>Proyecto:</strong> ${escapeHtml(record.project||'—')}</p><p><strong>Descripción:</strong> ${escapeHtml(record.description)}</p><p><strong>Monto:</strong> ${money(record.amount)}</p>${linksHtml(uploaded)}`});
          result.microsoft.mail='ENVIADO';
        }
      }catch(e){result.microsoft={status:'ERROR',message:e.message,processedAt:nowIso()};errors.push(`Microsoft: ${e.message}`)}
    }
    const tc=telegramConfig();
    if(tc.enabled&&tc.sendTransactions){try{await postTelegram('skc.transaction.created',{code:record.code,movementType:record.movementType,amount:record.amount,user:record.accountUsername,project:record.project,description:record.description,files:uploaded});result.telegram={status:'OK',processedAt:nowIso()}}catch(e){result.telegram={status:'ERROR',message:e.message,processedAt:nowIso()};errors.push(`Telegram: ${e.message}`)}}
    try{const excelConfig=officialExcel.config();if(excelConfig.autoUpload&&sync.isConfigured()){const sr=await sync.syncNow();if(sr.errors?.length)throw new Error(`La sincronización previa al Excel tuvo ${sr.errors.length} error(es).`)}const x=await officialExcel.autoUpload();if(!x.skipped)result.excel={status:'OK',file:x.item?.name||excelConfig.filename,processedAt:nowIso()}}catch(e){result.excel={status:'ERROR',message:e.message,processedAt:nowIso()};errors.push(`Excel: ${e.message}`)}
    await store.recordIntegrationResult('transactions',record.id,result).catch(()=>{});
    return{ok:errors.length===0,errors,result};
  },
  async publishTransfer(message,files=[]){
    const result={microsoft:{status:'OMITIDO'},telegram:{status:'OMITIDO'},updatedAt:nowIso()};
    const errors=[];let uploaded=[];const mc=graph.config();
    if(mc.enabled){try{if(!graph.isConnected())throw new Error('Microsoft está configurado pero no hay una sesión conectada.');uploaded=await graphEvidence(`Transferencias/${message.transferDate}/${message.code}`,files);result.microsoft={status:'OK',files:uploaded,processedAt:nowIso()};if(mc.sendOutlook&&mc.notifyEmail){await graph.sendMail({to:mc.notifyEmail,subject:`SKC · Transferencia ${message.code} · ${money(message.amount)}`,html:`<h2>Aviso de transferencia</h2><p><strong>De:</strong> ${escapeHtml(message.senderName)}</p><p><strong>Para:</strong> ${escapeHtml(message.recipientName)}</p><p><strong>Monto:</strong> ${money(message.amount)}</p><p><strong>Concepto:</strong> ${escapeHtml(message.reason)}</p>${linksHtml(uploaded)}`});result.microsoft.mail='ENVIADO'}}catch(e){result.microsoft={status:'ERROR',message:e.message,processedAt:nowIso()};errors.push(`Microsoft: ${e.message}`)}}
    const tc=telegramConfig();if(tc.enabled&&tc.sendTransfers){try{await postTelegram('skc.transfer.sent',{code:message.code,amount:message.amount,from:message.senderName,to:message.recipientName,project:message.project,reason:message.reason,files:uploaded});result.telegram={status:'OK',processedAt:nowIso()}}catch(e){result.telegram={status:'ERROR',message:e.message,processedAt:nowIso()};errors.push(`Telegram: ${e.message}`)}}
    await store.recordIntegrationResult('messages',message.id,result).catch(()=>{});return{ok:errors.length===0,errors,result};
  }
};
