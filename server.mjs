// Local server for the TabLab site. No packages needed: `npm run dev`.
// Serves this folder, and reloads open pages when a file in css/, js/, assets/ or index.html changes.
import { createServer } from 'node:http';
import { createReadStream, readFileSync, statSync, watch } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)));
const START_PORT = Number(process.env.PORT) || 5520;

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.txt': 'text/plain; charset=utf-8', '.map': 'application/json'
};

// Live reload: pages listen on /__reload; the snippet goes only into this site's own index.html.
const clients = new Set();
const RELOAD_SNIPPET = '<script>new EventSource("/__reload").onmessage=()=>location.reload();</script>';

function resolveFile(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath.split('?')[0])).replace(/^([/\\])+/, '');
  let file = join(ROOT, clean);
  if (!file.startsWith(ROOT + sep) && file !== ROOT) return null;
  try {
    if (statSync(file).isDirectory()) file = join(file, 'index.html');
    return statSync(file).isFile() ? file : null;
  } catch { return null; }
}

const server = createServer((req, res) => {
  if (req.url === '/__reload') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write('retry: 1000\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }
  // A folder asked for without its slash: redirect, so relative paths inside it resolve.
  const pathOnly = req.url.split('?')[0];
  if (!pathOnly.endsWith('/') && !extname(pathOnly)) {
    try { if (statSync(join(ROOT, decodeURIComponent(pathOnly))).isDirectory()) { res.writeHead(301, { Location: pathOnly + '/' }); return res.end(); } } catch {}
  }
  const file = resolveFile(req.url);
  if (!file) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Not found'); }
  const type = TYPES[extname(file).toLowerCase()] || 'application/octet-stream';
  if (file === join(ROOT, 'index.html')) {
    const html = readFileSync(file, 'utf8').replace('</body>', RELOAD_SNIPPET + '</body>');
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
    return res.end(html);
  }
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
  createReadStream(file).pipe(res);
});

let timer;
for (const dir of ['css', 'js', 'assets']) {
  try { watch(join(ROOT, dir), { recursive: true }, notify); } catch {}
}
try { watch(join(ROOT, 'index.html'), notify); } catch {}
function notify() {
  clearTimeout(timer);
  timer = setTimeout(() => { for (const c of clients) c.write('data: reload\n\n'); }, 120);
}

function listen(port) {
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE' && port < START_PORT + 20) listen(port + 1);
    else { console.error(err.message); process.exit(1); }
  });
  server.listen(port, '127.0.0.1', () => {
    console.log(`\n  TabLab is running at http://127.0.0.1:${port}/\n  Edits to index.html, css/, js/ and assets/ reload the page.\n  Press Ctrl+C to stop.\n`);
  });
}
listen(START_PORT);
