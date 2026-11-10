import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { extname, resolve } from 'node:path';

const root = resolve('public');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.csv': 'text/csv; charset=utf-8' };
createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const path = resolve(root, pathname === '/' ? 'index.html' : pathname.slice(1));
  if (!path.startsWith(root) || !existsSync(path)) { response.writeHead(404); return response.end('Not found'); }
  response.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  response.end(readFileSync(path));
}).listen(Number(process.env.PORT || 4173), '127.0.0.1', () => console.log('Dashboard: http://127.0.0.1:4173'));

