const CACHE='skc-facturas-web-v2.4.0';
const ASSETS=[
  './','./index.html','./404.html','./manifest.webmanifest','./icons/icon.svg','./supabase-schema.sql','./app-config.schema.json','./SKC_configuracion_prototipo_ejemplo.json','./LAUNCH_CHECKLIST.md','./GRAPH_SETUP_10_MIN.md','./SUPABASE_SETUP_10_MIN.md','./TELEGRAM_SETUP.md','./ANDROID_NATIVE_READINESS.md',
  './assets/styles.css','./assets/app.js','./assets/view.js','./assets/mobile.js','./assets/db.js','./assets/files.js','./assets/store.js','./assets/sync.js','./assets/ui.js','./assets/utils.js','./assets/form-config.js','./assets/graph.js','./assets/integrations.js','./assets/excel-official.js','./assets/excel-writer.js',
  './assets/pages/home.js','./assets/pages/invoice.js','./assets/pages/messages.js','./assets/pages/reminders.js','./assets/pages/flow.js','./assets/pages/history.js','./assets/pages/settings.js','./assets/pages/manual.js'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  event.respondWith((async()=>{
    try{
      const response=await fetch(request);
      if(response.ok){
        const cache=await caches.open(CACHE);
        await cache.put(request,response.clone());
      }
      return response;
    }catch(error){
      const cached=await caches.match(request);
      if(cached)return cached;
      if(request.mode==='navigate'){
        const shell=await caches.match('./index.html');
        if(shell)return shell;
      }
      throw error;
    }
  })());
});
