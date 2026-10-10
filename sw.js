/* Offline support. Bump CACHE_VERSION when you deploy a new version so every device refreshes its copy.
   - The app files are cached on first visit, so the site opens with NO internet afterwards.
   - Online: always tries the network first (so updates arrive immediately), falls back to the cache when offline.
   - Google sign-in / Drive / API requests are never touched — they go straight to the network. */
const CACHE_VERSION = 'school-v2';
const CORE = ['./', 'index.html', 'style.css', 'script.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'privacy-policy.html', 'terms-of-service.html'];
const CDN = ['https://cdn.tailwindcss.com/3.4.17', 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'];

self.addEventListener('install', e=>{
  e.waitUntil((async()=>{
    const c = await caches.open(CACHE_VERSION);
    await Promise.all(CORE.map(u=>c.add(u).catch(()=>{})));
    await Promise.all(CDN.map(async u=>{ try{ const r = await fetch(u, {mode:'no-cors'}); await c.put(u, r); }catch(err){} }));
    self.skipWaiting();
  })());
});
self.addEventListener('activate', e=>{
  e.waitUntil((async()=>{
    const keys = await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE_VERSION).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', e=>{
  const req = e.request;
  if(req.method!=='GET') return;
  const url = new URL(req.url);
  if(/(^|\.)googleapis\.com$|(^|\.)google\.com$|(^|\.)gstatic\.com$|googleusercontent\.com$/.test(url.hostname)) return;   // Google: network only
  const isCdn = CDN.includes(req.url);
  const sameOrigin = url.origin===location.origin;
  if(!sameOrigin && !isCdn) return;
  e.respondWith((async()=>{
    const cache = await caches.open(CACHE_VERSION);
    try{
      const net = await fetch(req, isCdn ? {mode:'no-cors'} : undefined);
      if(net && (net.ok || net.type==='opaque')) cache.put(req, net.clone()).catch(()=>{});
      return net;
    }catch(err){
      const hit = await cache.match(req, {ignoreSearch:true}) || (req.mode==='navigate' ? (await cache.match('index.html') || await cache.match('./')) : null);
      if(hit) return hit;
      return new Response('Offline and not saved yet — open the site once with internet.', {status:503, headers:{'Content-Type':'text/plain'}});
    }
  })());
});
