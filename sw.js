var C='dt-v6',F=['./','index.html','three.min.js','icon-180.png'];
self.addEventListener('install',function(e){e.waitUntil(caches.open(C).then(function(c){return c.addAll(F)}));self.skipWaiting();});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(k){return Promise.all(k.filter(function(x){return x!==C}).map(function(x){return caches.delete(x)}))}));self.clients.claim();});
self.addEventListener('fetch',function(e){if(e.request.method!=='GET')return;
e.respondWith(new Promise(function(res){var done=false;var t=setTimeout(function(){caches.match(e.request).then(function(r){if(r&&!done){done=true;res(r)}})},4000);
fetch(e.request).then(function(r){clearTimeout(t);if(!done){done=true;res(r)}var cp=r.clone();caches.open(C).then(function(c){c.put(e.request,cp)});}).catch(function(){clearTimeout(t);caches.match(e.request).then(function(r){if(!done){done=true;res(r||new Response('',{status:504}))}})});}));});
