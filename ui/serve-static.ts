import { extname, join, normalize } from "node:path";

const DIST_DIR = join(import.meta.dir, "dist");
const host = process.env.PHISHNET_UI_HOST ?? "127.0.0.1";
const port = Number(process.env.PHISHNET_UI_PORT ?? 54321);

const MIME_BY_EXT: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function contentTypeFor(pathname: string): string {
  return (
    MIME_BY_EXT[extname(pathname).toLowerCase()] ?? "application/octet-stream"
  );
}

function resolveFilePath(pathname: string): string {
  const sanitizedPath = pathname === "/" ? "/index.html" : pathname;
  const decoded = decodeURIComponent(sanitizedPath);
  const normalized = normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  return join(DIST_DIR, normalized);
}

async function serveFile(pathname: string): Promise<Response> {
  const filePath = resolveFilePath(pathname);
  const file = Bun.file(filePath);

  if (await file.exists()) {
    return new Response(file, {
      headers: {
        "content-type": contentTypeFor(filePath),
      },
    });
  }

  // SPA fallback for direct links.
  const indexFile = Bun.file(join(DIST_DIR, "index.html"));
  if (await indexFile.exists()) {
    return new Response(indexFile, {
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
      status: 200,
    });
  }

  return new Response("UI build not found. Run `bun run ui:build` first.", {
    status: 503,
    headers: {
      "content-type": "text/plain; charset=utf-8",
    },
  });
}

Bun.serve({
  fetch(request) {
    const url = new URL(request.url);
    return serveFile(url.pathname);
  },
  hostname: host,
  port,
});

console.log(`Phishnet UI static server listening on http://${host}:${port}`);
