import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildLeadFromPayload, saveLeadAndSendConfirmation } from './leads-service.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
loadEnvFile(path.join(root, '.env'));

const publicDir = path.resolve(root, process.argv[2] || '.');
const port = Number(process.argv[3] || process.env.PORT || 4173);
const dbPath = path.resolve(process.env.DB_PATH || path.join(root, 'db.json'));
const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8'
};

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;

  const contents = readFileSync(filePath, 'utf8');

  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    if (process.env[key]) continue;

    process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
  }
}

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

async function createLead(lead) {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Supabase nao configurado');
    }

    const db = await readDb();
    const localLead = { id: randomUUID(), ...lead };
    db.leads.push(localLead);
    await writeDb(db);
    return localLead;
  }

  const result = await saveLeadAndSendConfirmation(lead);
  return result.lead;
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
    const lead = buildLeadFromPayload(payload);

    sendJson(res, 201, { lead: await createLead(lead) });
  } catch (error) {
    sendJson(res, error.statusCode || 502, { error: error.message || 'Erro ao gravar cadastro' });
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
