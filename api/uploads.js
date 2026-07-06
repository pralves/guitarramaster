import { verifyToken } from '../scripts/auth-service.mjs';

const DEFAULT_BUCKET = 'lesson-assets';
const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024;

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const token = extractBearerToken(req);
    const user = await verifyToken(token, process.env);

    if (user.user_type !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const payload = getUploadPayload(req);
    const result = await uploadFile(payload, process.env);
    return res.status(201).json(result);
  } catch (error) {
    if (error.message === 'Token invÃ¡lido ou expirado' || error.statusCode === 401) {
      return res.status(401).json({ error: 'NÃ£o autenticado' });
    }

    res.status(error.statusCode || 502).json({
      error: error.message || 'Erro ao fazer upload'
    });
  }
}

async function uploadFile(payload, env) {
  const supabaseUrl = String(env.SUPABASE_URL || '').replace(/\/$/, '');
  const serviceRoleKey = String(env.SUPABASE_SERVICE_ROLE_KEY || '');
  const bucket = String(env.SUPABASE_LESSON_BUCKET || DEFAULT_BUCKET);
  const maxFileSize = Number(env.SUPABASE_LESSON_MAX_FILE_SIZE || DEFAULT_MAX_FILE_SIZE);
  const folder = sanitizePathPart(payload?.folder || 'lessons');
  const fileName = sanitizeFileName(payload?.file_name || '');
  const contentType = String(payload?.content_type || 'application/octet-stream');
  const base64 = String(payload?.data_base64 || '');
  const bytes = payload?.bytes;
  const stream = payload?.stream;
  const contentLength = payload?.content_length;

  if (!supabaseUrl || !serviceRoleKey) {
    const error = new Error('Supabase nÃ£o configurado');
    error.statusCode = 500;
    throw error;
  }

  if (!fileName || (!base64 && !bytes && !stream)) {
    const error = new Error('Arquivo invÃ¡lido');
    error.statusCode = 400;
    throw error;
  }

  await ensureBucket({ supabaseUrl, serviceRoleKey, bucket, maxFileSize });

  const objectPath = `${folder}/${Date.now()}-${fileName}`;
  const uploadBody = stream || bytes || Buffer.from(base64, 'base64');
  const headers = {
    Authorization: `Bearer ${serviceRoleKey}`,
    apikey: serviceRoleKey,
    'Content-Type': contentType,
    'x-upsert': 'true'
  };

  if (contentLength) {
    headers['Content-Length'] = contentLength;
  }

  const uploadResponse = await fetch(
    `${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`,
    {
      method: 'POST',
      headers,
      body: uploadBody,
      duplex: stream ? 'half' : undefined
    }
  );

  const text = await uploadResponse.text();

  if (!uploadResponse.ok) {
    const error = new Error(text || 'Erro ao enviar arquivo para o Storage');
    error.statusCode = 502;
    throw error;
  }

  return {
    bucket,
    object_path: objectPath,
    public_url: `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`
  };
}

async function ensureBucket({ supabaseUrl, serviceRoleKey, bucket, maxFileSize }) {
  const response = await fetch(`${supabaseUrl}/storage/v1/bucket/${bucket}`, {
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey
    }
  });

  if (response.ok) {
    await updateBucketLimit({ supabaseUrl, serviceRoleKey, bucket, maxFileSize });
    return;
  }

  const createResponse = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: bucket,
      name: bucket,
      public: true,
      file_size_limit: maxFileSize
    })
  });

  if (!createResponse.ok && createResponse.status !== 409) {
    const text = await createResponse.text();
    const error = new Error(text || 'Erro ao criar bucket de aulas');
    error.statusCode = 502;
    throw error;
  }
}

async function updateBucketLimit({ supabaseUrl, serviceRoleKey, bucket, maxFileSize }) {
  const response = await fetch(`${supabaseUrl}/storage/v1/bucket/${bucket}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      public: true,
      file_size_limit: maxFileSize
    })
  });

  if (!response.ok) {
    const text = await response.text();
    console.warn('Nao foi possivel atualizar limite do bucket:', text);
  }
}

function getUploadPayload(req) {
  if (req.body?.data_base64) {
    return req.body;
  }

  const query = req.query || {};

  return {
    folder: query.folder,
    file_name: query.fileName || query.file_name,
    content_type: req.headers['content-type'] || 'application/octet-stream',
    content_length: req.headers['content-length'],
    stream: req
  };
}

function sanitizePathPart(value) {
  return String(value)
    .trim()
    .replace(/[^a-zA-Z0-9/_-]/g, '-')
    .replace(/^-+|-+$/g, '') || 'lessons';
}

function sanitizeFileName(value) {
  return String(value)
    .trim()
    .replace(/[\\/]/g, '-')
    .replace(/[^a-zA-Z0-9._-]/g, '-');
}

function extractBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : '';
}
