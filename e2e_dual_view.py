const CACHE='skc-facturas-web-v2.2.0';
const ASSETS=[
  './','./index.html','./404.html','./manifest.webmanifest','./icons/icon.svg','./supabase-schema.sql','./app-config.schema.json','./SKC_configuracion_prototipo_ejemplo.json','./LAUNCH_CHECKLIST.md','./GRAPH_SETUP_10_MIN.md','./SUPABASE_SETUP_10_MIN.md','./TELEGRAM_SETUP.md','./ANDROID_NATIVE_READINESS.md',
  './assets/styles.css','./assets/app.js','./assets/view.js','./assets/mobile.js','./assets/db.js','./assets/files.js','./assets/store.js','./assets/sync.js','./assets/ui.js','./assets/utils.js','./assets/form-config.js','./assets/graph.js','./assets/integrations.js',
  './assets/pages/home.js','./assets/pages/invoice.js','./assets/pages/messages.js','./assets/pages/reminders.js','./assets/pages/flow.js','./assets/pages/history.js','./assets/pages/settings.js','./assets/pages/manual.js'
];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response}).catch(()=>caches.match(event.request).then(r=>r||caches.match('./index.html'))));
});
