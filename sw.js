const CACHE_NAME = 'pk-practice-root-v4';

// শুধু রুট লেভেলের অফলাইন ফাইলগুলো ক্যাশ হবে
const OFFLINE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json'
];

// এই ফাইল, ফোল্ডার বা ডোমেইনগুলো কখনোই ক্যাশ হবে না (শুধু অনলাইনে চলবে)
const ONLINE_ONLY_PATTERNS = [
  '/question practice/',
  'friends.html',
  'friends.css',
  'friends.js',
  'firebaseio.com',
  'firebasedatabase.app',
  'googleapis.com',
  'gstatic.com'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

function isOnlineOnlyRequest(urlString) {
  return ONLINE_ONLY_PATTERNS.some((pattern) => urlString.includes(pattern));
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const requestUrl = event.request.url;

  // অনলাইন ফাইল হলে সরাসরি নেটওয়ার্ক থেকে আনবে, ক্যাশ করবে না
  if (isOnlineOnlyRequest(requestUrl)) {
    event.respondWith(fetch(event.request));
    return;
  }

  // বাকি ফাইলের জন্য Network-First: আগে ইন্টারনেট -> না থাকলে অফলাইন ক্যাশ
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === 'basic'
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) return cachedResponse;

        // পেজ নেভিগেশন অফলাইনে ফেল করলে index.html দেখাবে
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      })
  );
});
