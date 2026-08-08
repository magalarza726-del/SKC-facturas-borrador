import {sha256Blob,uuid} from './utils.js';

export const MAX_EVIDENCE_BYTES=20*1024*1024;
export const EVIDENCE_ACCEPT='.pdf,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif';
export const EVIDENCE_FORMAT_LABEL='PDF, JPG, PNG, WEBP, GIF, HEIC o HEIF';
export const ALLOWED_EVIDENCE_MIME=new Set([
  'application/pdf','image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif'
]);

const MIME_BY_EXTENSION={
  pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',heic:'image/heic',heif:'image/heif'
};

export function evidenceMime(file){
  const declared=String(file?.type||'').toLowerCase();
  if(ALLOWED_EVIDENCE_MIME.has(declared))return declared;
  const extension=String(file?.name||'').split('.').pop()?.toLowerCase();
  return MIME_BY_EXTENSION[extension]||declared||'application/octet-stream';
}

export async function prepareFileRecords(list){
  const files=[...(list||[])],out=[];
  for(const file of files){
    if(!file?.size)throw new Error(`${file?.name||'El archivo'} está vacío.`);
    if(file.size>MAX_EVIDENCE_BYTES)throw new Error(`${file.name} supera el límite de 20 MB.`);
    const mime=evidenceMime(file);
    if(!ALLOWED_EVIDENCE_MIME.has(mime))throw new Error(`${file.name} no es un PDF o una imagen compatible.`);
    out.push({id:uuid(),filename:file.name,mime,size:file.size,sha256:await sha256Blob(file),remotePath:'',blob:file});
  }
  return out;
}
