import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
loadEnvFile(path.join(root, '.env'));

const supabaseUrl = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '');
const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = String(process.env.ADMIN_PASSWORD || '').trim();
const fullName = String(process.env.ADMIN_NAME || 'Admin').trim();

if (!supabaseUrl || !serviceRoleKey) {
  fail('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar configurados no .env.');
}

if (!email || !email.includes('@')) {
  fail('Informe ADMIN_EMAIL com um e-mail valido.');
}

if (!password || password.length < 6) {
  fail('Informe ADMIN_PASSWORD com pelo menos 6 caracteres.');
}

const authHeaders = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${serviceRoleKey}`,
  apikey: serviceRoleKey
};

const user = await ensureAuthUser();
await ensureAdminProfile(user);

console.log(`Admin pronto: ${email}`);

async function ensureAuthUser() {
  const existing = await findAuthUserByEmail(email);
  if (existing) {
    await updateAuthUserPassword(existing.id);
    return existing;
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      email,
      password,
      email_confirm: true
    })
  });

  const data = await readJson(response);
  if (!response.ok) {
    if (data?.code === '23505') {
      const duplicatedUser = await findAuthUserByEmail(email);
      if (duplicatedUser) {
        await updateAuthUserPassword(duplicatedUser.id);
        return duplicatedUser;
      }

      fail(
        'O e-mail ja existe em auth.users, mas a API Admin nao consegue lista-lo. ' +
        'Execute supabase/repair-admin-auth.sql no SQL Editor do Supabase para reparar esse usuario.'
      );
    }

    fail(formatApiError('Erro ao criar usuario Auth', response, data));
  }

  return data.user || data;
}

async function findAuthUserByEmail(targetEmail) {
  const perPage = 100;
  let page = 1;

  while (true) {
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=${page}&per_page=${perPage}`, {
      headers: authHeaders
    });

    const data = await readJson(response);
    if (!response.ok) {
      fail(formatApiError('Erro ao listar usuarios Auth', response, data));
    }

    const users = Array.isArray(data.users) ? data.users : Array.isArray(data) ? data : [];
    const user = users.find(item => String(item.email || '').toLowerCase() === targetEmail);
    if (user) return user;

    const lastPage = Number(data.last_page || data.lastPage || 0);
    if (lastPage > 0 && page >= lastPage) return null;
    if (!lastPage && users.length === 0) return null;

    page += 1;
  }
}

async function updateAuthUserPassword(userId) {
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      password,
      email_confirm: true
    })
  });

  const data = await readJson(response);
  if (!response.ok) {
    fail(formatApiError('Erro ao atualizar senha do usuario Auth', response, data));
  }
}

async function ensureAdminProfile(user) {
  const existing = await findProfileByEmail(email);
  const payload = {
    id: user.id,
    email,
    full_name: fullName,
    user_type: 'admin',
    active: true
  };

  if (existing) {
    const response = await fetch(`${supabaseUrl}/rest/v1/user_profiles?email=eq.${encodeURIComponent(email)}`, {
      method: 'PATCH',
      headers: {
        ...authHeaders,
        Prefer: 'return=representation'
      },
      body: JSON.stringify(payload)
    });

    const data = await readJson(response);
    if (!response.ok) {
      fail(formatApiError('Erro ao atualizar perfil admin', response, data));
    }
    return;
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/user_profiles`, {
    method: 'POST',
    headers: {
      ...authHeaders,
      Prefer: 'return=representation'
    },
    body: JSON.stringify(payload)
  });

  const data = await readJson(response);
  if (!response.ok) {
    fail(formatApiError('Erro ao criar perfil admin', response, data));
  }
}

async function findProfileByEmail(targetEmail) {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/user_profiles?email=eq.${encodeURIComponent(targetEmail)}&select=id,email`,
    { headers: authHeaders }
  );

  const data = await readJson(response);
  if (!response.ok) {
    fail(formatApiError('Erro ao consultar perfil admin', response, data));
  }

  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function formatApiError(prefix, response, data) {
  const parts = [
    `${prefix}.`,
    `HTTP ${response.status}`
  ];

  for (const key of ['code', 'msg', 'message', 'error_description', 'error', 'details', 'hint', 'raw']) {
    if (data?.[key]) parts.push(`${key}: ${data[key]}`);
  }

  return parts.join(' ');
}

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

function fail(message) {
  console.error(message);
  process.exit(1);
}
