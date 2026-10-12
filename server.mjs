// Servidor local mínimo, sin dependencias:  node server.mjs  (o  npm start)
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 5173;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

http
  .createServer(async (req, res) => {
    try {
      let rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (rel.endsWith('/')) rel += 'index.html';
      const file = path.join(ROOT, rel);
      if (!file.startsWith(ROOT + path.sep)) throw new Error('fuera del proyecto');
      const data = await readFile(file);
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(data);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('No encontrado');
    }
  })
  .listen(PORT, '0.0.0.0', () => {
    console.log(`\n  Gomitas of Love está lista:\n\n  En este computador:  http://localhost:${PORT}`);
    for (const list of Object.values(os.networkInterfaces())) {
      for (const n of list || []) {
        if (n.family === 'IPv4' && !n.internal) console.log(`  En el teléfono (misma wifi):  http://${n.address}:${PORT}`);
      }
    }
    console.log('\n  Ctrl+C para detener.\n');
  });
