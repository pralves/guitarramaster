import { sendLeadConfirmationEmail } from './email-service.mjs';

const DEFAULT_LEADS_TABLE = 'minicurso_inscricoes';
const DUPLICATE_LEAD_MESSAGE = 'E-mail ou telefone ja cadastrado';

export function buildLeadFromPayload(payload) {
  const name = String(payload?.name || '').trim();
  const email = String(payload?.email || '').trim();
  const phone = String(payload?.phone || '').trim();
  const state = String(payload?.state || '').trim();
  const instrument = String(payload?.instrument || '').trim();

  if (!name || !phone || phone.replace(/\D/g, '').length < 10 || !email || !email.includes('@') || !state || !instrument) {
    const error = new Error('Nome, telefone, e-mail, estado e instrumento sao obrigatorios');
    error.statusCode = 400;
    throw error;
  }

  return {
    name,
    email,
    phone,
    state,
    instrument,
    source: String(payload?.source || 'cadastro-interessado').trim(),
    created_at: new Date().toISOString()
  };
}

export async function saveLeadToSupabase(lead, env = process.env) {
  const supabaseUrl = String(env.SUPABASE_URL || '').replace(/\/$/, '');
  const supabaseServiceRoleKey = String(env.SUPABASE_SERVICE_ROLE_KEY || '');
  const supabaseLeadsTable = String(env.SUPABASE_LEADS_TABLE || DEFAULT_LEADS_TABLE);

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    const error = new Error('Supabase nao configurado');
    error.statusCode = 500;
    throw error;
  }

  const baseUrl = `${supabaseUrl}/rest/v1/${encodeURIComponent(supabaseLeadsTable)}`;
  const headers = {
    apikey: supabaseServiceRoleKey,
    Authorization: `Bearer ${supabaseServiceRoleKey}`
  };

  await assertLeadIsUnique(baseUrl, headers, lead);

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify(lead)
  });

  const text = await response.text();

  if (!response.ok) {
    const error = new Error(text || 'Erro ao gravar no Supabase');
    error.statusCode = 502;
    throw error;
  }

  return text ? JSON.parse(text)[0] : lead;
}

export async function saveLeadAndSendConfirmation(lead, env = process.env) {
  const savedLead = await saveLeadToSupabase(lead, env);
  let emailSent = false;

  try {
    emailSent = await sendLeadConfirmationEmail({ ...lead, ...savedLead }, env);
  } catch (error) {
    console.error('Confirmation email error', error);
  }

  return { lead: savedLead, emailSent };
}

async function assertLeadIsUnique(baseUrl, headers, lead) {
  const [emailExists, phoneExists] = await Promise.all([
    fieldValueExists(baseUrl, headers, 'email', lead.email),
    fieldValueExists(baseUrl, headers, 'phone', lead.phone)
  ]);

  if (!emailExists && !phoneExists) return;

  const error = new Error(DUPLICATE_LEAD_MESSAGE);
  error.statusCode = 409;
  throw error;
}

async function fieldValueExists(baseUrl, headers, field, value) {
  const params = new URLSearchParams({
    select: 'id',
    [field]: `eq.${value}`,
    limit: '1'
  });

  const response = await fetch(`${baseUrl}?${params.toString()}`, {
    method: 'GET',
    headers
  });

  const text = await response.text();

  if (!response.ok) {
    const error = new Error(text || 'Erro ao verificar cadastro no Supabase');
    error.statusCode = 502;
    throw error;
  }

  return text ? JSON.parse(text).length > 0 : false;
}
