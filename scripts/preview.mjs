import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.resolve(root, process.argv[2] || '.');
const port = Number(process.argv[3] || process.env.PORT || 4173);
const dbPath = path.resolve(process.env.DB_PATH || path.join(root, 'db.json'));

const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8'
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {'Content-Type': 'application/json; charset=utf-8'});
  res.end(JSON.stringify(payload));
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });

    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

async function readDb() {
  if (!existsSync(dbPath)) {
    return { leads: [] };
  }

  const contents = await readFile(dbPath, 'utf8');
  if (!contents.trim()) {
    return { leads: [] };
  }

  const db = JSON.parse(contents);
  return {
    ...db,
    leads: Array.isArray(db.leads) ? db.leads : []
  };
}

async function writeDb(db) {
  await mkdir(path.dirname(dbPath), { recursive: true });
  await writeFile(dbPath, `${JSON.stringify(db, null, 2)}\n`, 'utf8');
}

async function handleApi(req, res, url) {
  if (url.pathname !== '/api/leads') {
    sendJson(res, 404, { error: 'Endpoint not found' });
    return;
  }

  if (req.method === 'GET') {
    sendJson(res, 200, await readDb());
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  try {
    const payload = JSON.parse(await readRequestBody(req));
    const name = String(payload.name || '').trim();
    const email = String(payload.email || '').trim();

    if (!name || !email || !email.includes('@')) {
      sendJson(res, 400, { error: 'Nome e e-mail valido sao obrigatorios' });
      return;
    }

    const db = await readDb();
    const lead = {
      id: randomUUID(),
      name,
      email,
      phone: String(payload.phone || '').trim(),
      message: String(payload.message || '').trim(),
      source: String(payload.source || 'cadastro-interessado').trim(),
      createdAt: new Date().toISOString()
    };

    db.leads.push(lead);
    await writeDb(db);
    sendJson(res, 201, { lead });
  } catch (error) {
    sendJson(res, 400, { error: error.message || 'Invalid request' });
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${port}`);

  if (url.pathname.startsWith('/api/')) {
    await handleApi(req, res, url);
    return;
  }

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
