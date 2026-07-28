import{sha256Blob,uuid}from'./utils.js';
export async function prepareFileRecords(list){const out=[];for(const f of[...(list||[])]){if(f.size>20*1024*1024)throw new Error(`${f.name} supera el límite de 20 MB.`);out.push({id:uuid(),filename:f.name,mime:f.type||'application/octet-stream',size:f.size,sha256:await sha256Blob(f),remotePath:'',blob:f})}return out}
