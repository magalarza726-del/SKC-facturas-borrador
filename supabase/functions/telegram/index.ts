// Supabase Edge Function: secure Telegram relay for SKC Facturas.
// Secrets: TELEGRAM_BOT_TOKEN and optionally ALLOWED_ORIGIN.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const escapeHtml=(value:unknown)=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]||ch));

const cors=(origin:string)=>({
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") || origin || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
});

Deno.serve(async req=>{
  const origin=req.headers.get("origin")||"",allowed=Deno.env.get("ALLOWED_ORIGIN")||"";
  if(allowed&&origin&&origin!==allowed)return new Response(JSON.stringify({ok:false,message:"Origin not allowed"}),{status:403,headers:cors(origin)});
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors(origin)});
  if(req.method!=="POST")return new Response(JSON.stringify({ok:false,message:"Method not allowed"}),{status:405,headers:cors(origin)});
  try{
    const token=Deno.env.get("TELEGRAM_BOT_TOKEN");if(!token)throw new Error("TELEGRAM_BOT_TOKEN no está configurado.");
    const {event,chatId,payload}=await req.json();if(!chatId)throw new Error("Falta chatId.");
    const lines=[`<b>SKC Facturas</b>`,event?`Evento: <code>${escapeHtml(event)}</code>`:"",payload?.code?`Código: <b>${escapeHtml(payload.code)}</b>`:"",payload?.amount!==undefined?`Monto: <b>$${Number(payload.amount).toFixed(2)}</b>`:"",payload?.user?`Usuario: ${escapeHtml(payload.user)}`:"",payload?.from&&payload?.to?`De ${escapeHtml(payload.from)} para ${escapeHtml(payload.to)}`:"",payload?.project?`Proyecto: ${escapeHtml(payload.project)}`:"",escapeHtml(payload?.description||payload?.reason||payload?.message||"")].filter(Boolean);
    const r=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id:chatId,text:lines.join("\n"),parse_mode:"HTML",disable_web_page_preview:true})});
    const d=await r.json();if(!r.ok||!d.ok)throw new Error(d.description||`Telegram respondió ${r.status}`);
    return new Response(JSON.stringify({ok:true,result:d.result}),{headers:cors(origin)});
  }catch(e){return new Response(JSON.stringify({ok:false,message:e instanceof Error?e.message:String(e)}),{status:400,headers:cors(origin)})}
});
