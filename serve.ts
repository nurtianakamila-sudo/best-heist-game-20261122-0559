// serve.ts — a tiny static file server for play-testing The Gilded Vault.
// Run `node serve.ts` (or `node serve.ts --port 8123`), then open
// http://localhost:8080 in a desktop browser. Standard library only; it
// serves nothing outside game/ and sets the MIME types a browser game needs.

import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('./game', import.meta.url)));
const args = process.argv.slice(2);
const portFlag = args.indexOf('--port');
const wanted = portFlag === -1 ? 8080 : Number(args[portFlag + 1]);
const port = Number.isInteger(wanted) && wanted > 0 && wanted < 65536 ? wanted : 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost');
  let pathname = url.pathname;
  try {
    pathname = decodeURIComponent(pathname);
  } catch {
    response.writeHead(400).end('bad request');
    return;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = resolve(join(root, normalize(pathname)));
  if (!file.startsWith(root + sep) && file !== root) {
    response.writeHead(403).end('forbidden');
    return;
  }
  let stat;
  try {
    stat = statSync(file);
  } catch {
    response.writeHead(404).end('not found');
    return;
  }
  if (!stat.isFile()) {
    response.writeHead(404).end('not found');
    return;
  }
  response.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(response);
}).listen(port, () => {
  console.log(`The Gilded Vault at http://localhost:${port}/`);
});
