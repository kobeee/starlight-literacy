import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const root = normalize(join(here, "../../.."));
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".ogg": "audio/ogg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};
const rangeTypes = new Set([".mp4", ".webm"]);

const APP_PREFIX = "/src/clients/mobile-h5/";

function resolvePath(url) {
  const pathname = decodeURIComponent(new URL(url, `http://${host}:${port}`).pathname);
  const requested = pathname === APP_PREFIX
    ? `${APP_PREFIX}index.html`
    : pathname;
  const fullPath = normalize(join(root, requested));
  if (!fullPath.startsWith(root)) return null;
  if (existsSync(fullPath) && statSync(fullPath).isDirectory()) {
    return join(fullPath, "index.html");
  }
  return fullPath;
}

const server = createServer((req, res) => {
  const url = req.url || "/";
  const pathname = decodeURIComponent(new URL(url, `http://${host}:${port}`).pathname);

  if (pathname === "/") {
    res.writeHead(302, { location: APP_PREFIX });
    res.end();
    return;
  }

  const fullPath = resolvePath(url);
  if (!fullPath || !existsSync(fullPath)) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  const extension = extname(fullPath);
  const type = types[extension] || "application/octet-stream";
  const stats = statSync(fullPath);
  const range = req.headers.range;

  if (range && rangeTypes.has(extension)) {
    const match = range.match(/bytes=(\d*)-(\d*)/);
    const start = match?.[1] ? Number(match[1]) : 0;
    const end = match?.[2] ? Number(match[2]) : stats.size - 1;
    const safeEnd = Math.min(end, stats.size - 1);
    if (Number.isNaN(start) || Number.isNaN(safeEnd) || start > safeEnd) {
      res.writeHead(416, { "content-range": `bytes */${stats.size}` });
      res.end();
      return;
    }
    res.writeHead(206, {
      "content-type": type,
      "content-length": safeEnd - start + 1,
      "content-range": `bytes ${start}-${safeEnd}/${stats.size}`,
      "accept-ranges": "bytes",
      "cache-control": "no-store"
    });
    createReadStream(fullPath, { start, end: safeEnd }).pipe(res);
    return;
  }

  res.writeHead(200, {
    "content-type": type,
    "content-length": stats.size,
    "accept-ranges": rangeTypes.has(extension) ? "bytes" : "none",
    "cache-control": "no-store"
  });
  createReadStream(fullPath).pipe(res);
});

server.listen(port, host, () => {
  console.log(`Mobile H5: http://${host}:${port}/src/clients/mobile-h5/`);
});
