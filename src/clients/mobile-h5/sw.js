const VERSION = "v39";
const STATIC_CACHE = `starlight-mobile-h5-static-${VERSION}`;
const ASSET_CACHE = `starlight-mobile-h5-assets-${VERSION}`;
const CACHE_NAME = `starlight-mobile-h5-${VERSION}`;

const V = VERSION.replace(/^v/, "");
const STATIC_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  `./styles.css?v=${V}`,
  `./app.js?v=${V}`,
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/og-image-1200.png",
  "../../shared/unit-01-lessons.js",
  `../../shared/unit-01.js?v=${V}`,
  `../../shared/unit-01-baked-audio.js?v=${V}`,
  `../../shared/unit-01-visual-assets.js?v=${V}`
];

const IMAGE_SHELL = [
  "./assets/learning/unit-01/style/unit01-style-board-v1.png",
  "./assets/learning/unit-01/scenes/group-01-line-count-scene-v1.png",
  "./assets/learning/unit-01/scenes/group-02-position-body-scene-v1.png",
  "./assets/learning/unit-01/scenes/group-03-nature-pictograph-scene-v1.png",
  "./assets/learning/unit-01/scenes/group-04-nature-body-review-scene-v1.png",
  "../../../images/p01-bg-redraw-road-centered-20260426.png",
  "../../../images/p01-pastoral-overlay-20260426.png",
  "../../../images/p01-animal-edge-overlay-20260426.png",
  "../../../images/generated-daytime-fire-lesson.png",
  "../../../images/generated-daytime-result-celebration-clean.png",
  "./assets/recognition/yi/yi-gpt-image-2-production-v4-poster.png",
  "./assets/recognition/yi/yi-gpt-image-2-production-v4-final.png"
];

const RECOGNITION_SHELL = [
  "./assets/recognition/yi/yi-gpt-image-2-production-v4.mp4",
  "./assets/recognition/yi/yi-gpt-image-2-production-v4.webm",
  "./assets/recognition/yi/yi-gpt-image-2-production-v4-narration.mp3"
];

const CHAR_KEYS = [
  "da", "er", "er-ear", "huo", "kou", "mu", "mu-eye", "ren", "ri", "san",
  "shan", "shang", "shou", "shui", "tian", "tu", "xia", "xiao", "yi", "yue"
];
const AUDIO_KINDS = ["char", "phrase", "soundCue"];
const AUDIO_SHELL = CHAR_KEYS.flatMap((key) =>
  AUDIO_KINDS.map((kind) => `./assets/audio/unit-01/${key}/${kind}.mp3`)
);

async function safeAddAll(cacheName, urls) {
  const cache = await caches.open(cacheName);
  await Promise.allSettled(urls.map((url) => cache.add(url)));
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    await safeAddAll(STATIC_CACHE, STATIC_SHELL);
    await safeAddAll(ASSET_CACHE, [...IMAGE_SHELL, ...AUDIO_SHELL, ...RECOGNITION_SHELL]);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key !== STATIC_CACHE && key !== ASSET_CACHE)
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(handleNavigation(event.request));
    return;
  }

  if (/\.(mp3|mp4|webm|wav|ogg|png|jpg|jpeg|webp|svg|woff2?)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(event.request, ASSET_CACHE));
    return;
  }

  if (url.search.includes("v=") || /\.(js|css|webmanifest)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
    return;
  }

  event.respondWith(staleWhileRevalidate(event.request, STATIC_CACHE));
});

async function handleNavigation(request) {
  try {
    const fresh = await fetch(request);
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, fresh.clone()).catch(() => {});
    return fresh;
  } catch {
    const fallback = (await caches.match("./index.html")) || (await caches.match(request));
    return fallback || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch {
    return new Response("", { status: 504 });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request);
  const network = fetch(request)
    .then(async (response) => {
      if (response && response.status === 200) {
        const cache = await caches.open(cacheName);
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    })
    .catch(() => null);
  return cached || (await network) || new Response("", { status: 504 });
}
