const CACHE_NAME = "personal-assistant-v3-pwa-install";
const APP_SHELL = ["./"];
const SHARE_DB_NAME = "personal-assistant-share-target";
const SHARE_STORE_NAME = "restaurant-images";

function openShareDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SHARE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(SHARE_STORE_NAME))
        database.createObjectStore(SHARE_STORE_NAME, { keyPath: "id", autoIncrement: true });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function storeSharedRestaurantImages(request) {
  const formData = await request.formData();
  const photos = formData.getAll("photos").filter(value => value instanceof File && value.type.startsWith("image/"));
  if (!photos.length) return;
  const database = await openShareDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(SHARE_STORE_NAME, "readwrite");
    const store = transaction.objectStore(SHARE_STORE_NAME);
    photos.forEach(photo => store.add({
      blob: photo,
      name: photo.name || `맛집-캡처-${Date.now()}.jpg`,
      type: photo.type || "image/jpeg",
      lastModified: photo.lastModified || Date.now(),
    }));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
  database.close();
}

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method === "POST" && url.origin === self.location.origin && url.pathname.endsWith("/share-target")) {
    event.respondWith((async () => {
      try {
        await storeSharedRestaurantImages(event.request);
        return Response.redirect(new URL("./?share-target=1", self.registration.scope).href, 303);
      } catch {
        return Response.redirect(new URL("./?share-target=error", self.registration.scope).href, 303);
      }
    })());
    return;
  }
  if (event.request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
    return response;
  }).catch(async () => (await caches.match(event.request)) || (event.request.mode === "navigate" ? caches.match("./") : Response.error())));
});
