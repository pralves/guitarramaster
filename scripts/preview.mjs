import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.resolve(root, process.argv[2] || '.');
const port = Number(process.argv[3] || process.env.PORT || 4173);

const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8'
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${port}`);
  const decodedPath = decodeURIComponent(url.pathname);
  const safePath = path.normalize(decodedPath).replace(/^(\.\.[/\\])+/, '');
  let filePath = path.join(publicDir, safePath);

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (!existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  if (statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  res.writeHead(200, {
    'Content-Type': types[path.extname(filePath)] || 'application/octet-stream'
  });
  createReadStream(filePath).pipe(res);
});

server.listen(port, () => {
  console.log(`Preview em http://localhost:${port}`);
  console.log(`Servindo ${publicDir}`);
});
