export const APP_VERSION='2.4.0';
export const nowIso=()=>new Date().toISOString();
export function todayIso(){const d=new Date(),o=d.getTimezoneOffset()*60000;return new Date(d-o).toISOString().slice(0,10)}
export const uuid=()=>crypto.randomUUID();
export function deterministicId(ns,v){const s=`${ns}:${v}`;let a=0xdeadbeef^s.length,b=0x41c6ce57^s.length;for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);a=Math.imul(a^c,2654435761);b=Math.imul(b^c,1597334677)}a=Math.imul(a^(a>>>16),2246822507)^Math.imul(b^(b>>>13),3266489909);b=Math.imul(b^(b>>>16),2246822507)^Math.imul(a^(a>>>13),3266489909);return`${ns.toLowerCase()}-${(4294967296*(2097151&b)+(a>>>0)).toString(16).padStart(14,'0')}`}
export const cleanText=v=>String(v??'').trim().replace(/\s+/g,' ');
export function normalizeToken(v){return cleanText(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]/g,'').toUpperCase()}
export function invoiceKey(s,n){const a=normalizeToken(s),b=normalizeToken(n);return a&&b?`${a}|${b}`:''}
export const money=v=>new Intl.NumberFormat('es-US',{style:'currency',currency:'USD',minimumFractionDigits:2}).format(Number(v||0));
export function dateLabel(v,time=false){if(!v)return'—';const d=/^\d{4}-\d{2}-\d{2}$/.test(v)?new Date(`${v}T12:00:00`):new Date(v);if(Number.isNaN(d.getTime()))return String(v);return new Intl.DateTimeFormat('es-US',time?{dateStyle:'medium',timeStyle:'short'}:{dateStyle:'medium'}).format(d)}
export function escapeHtml(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')}
export function bytesLabel(v){const n=Number(v||0);return n<1024?`${n} B`:n<1048576?`${(n/1024).toFixed(1)} KB`:`${(n/1048576).toFixed(1)} MB`}
export async function sha256Blob(b){const d=await crypto.subtle.digest('SHA-256',await b.arrayBuffer());return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('')}
export async function sha256Text(s){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('')}
export async function combinedHash(m){const h=m.map(x=>x.sha256).filter(Boolean).sort();return h.length?sha256Text(h.join('|')):''}
export function code(p,u=''){return`${p}-${todayIso().replaceAll('-','')}-${normalizeToken(u).slice(0,8)||'USUARIO'}-${uuid().replaceAll('-','').slice(0,6).toUpperCase()}`}
export const signedAmount=e=>e.direction==='INGRESO'?Math.abs(Number(e.amount||0)):-Math.abs(Number(e.amount||0));
export function dayDifference(a,b){return Math.abs(Math.round((new Date(`${a}T12:00:00`)-new Date(`${b}T12:00:00`))/86400000))}
export const sortByDateDesc=(xs,f='updatedAt')=>[...xs].sort((a,b)=>String(b[f]||'').localeCompare(String(a[f]||'')));
export function downloadBlob(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),5000)}
export const csvEscape=v=>/[",\n]/.test(String(v??''))?`"${String(v??'').replaceAll('"','""')}"`:String(v??'');
export function parseLines(v){const s=new Set;return String(v||'').split(/\r?\n|,/).map(cleanText).filter(x=>{const k=x.toLocaleLowerCase('es');if(!x||s.has(k))return false;s.add(k);return true})}
export const safeFilename=v=>cleanText(v).replace(/[\\/:*?"<>|]+/g,'_').slice(0,100)||'archivo';
