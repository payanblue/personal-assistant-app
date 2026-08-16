const CACHE_NAME = "personal-assistant-v4-map-share";
const APP_SHELL = ["./"];
const SHARE_DB_NAME = "personal-assistant-share-target";
const SHARE_STORE_NAME = "restaurant-images";
const SHARE_TEXT_STORE_NAME = "restaurant-places";

function openShareDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SHARE_DB_NAME, 2);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(SHARE_STORE_NAME))
        database.createObjectStore(SHARE_STORE_NAME, { keyPath: "id", autoIncrement: true });
      if (!database.objectStoreNames.contains(SHARE_TEXT_STORE_NAME))
        database.createObjectStore(SHARE_TEXT_STORE_NAME, { keyPath: "id", autoIncrement: true });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function storeSharedRestaurantContent(request) {
  const formData = await request.formData();
  const photos = formData.getAll("photos").filter(value => value instanceof File && value.type.startsWith("image/"));
  const title = String(formData.get("title") || "").trim();
  const text = String(formData.get("text") || "").trim();
  const url = String(formData.get("url") || "").trim();
  if (!photos.length && !title && !text && !url) return;
  const database = await openShareDatabase();
  await new Promise((resolve, reject) => {
    const stores = photos.length && (title || text || url)
      ? [SHARE_STORE_NAME, SHARE_TEXT_STORE_NAME]
      : photos.length ? [SHARE_STORE_NAME] : [SHARE_TEXT_STORE_NAME];
    const transaction = database.transaction(stores, "readwrite");
    const imageStore = photos.length ? transaction.objectStore(SHARE_STORE_NAME) : null;
    photos.forEach(photo => imageStore.add({
      blob: photo,
      name: photo.name || `맛집-캡처-${Date.now()}.jpg`,
      type: photo.type || "image/jpeg",
      lastModified: photo.lastModified || Date.now(),
    }));
    if (title || text || url)
      transaction.objectStore(SHARE_TEXT_STORE_NAME).add({ title, text, url, sharedAt: Date.now() });
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
        await storeSharedRestaurantContent(event.request);
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
