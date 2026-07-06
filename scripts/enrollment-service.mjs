import { registerStudent } from './auth-service.mjs';
import { grantModuleToStudent } from './student-class-service.mjs';

const LEADS_TABLE = 'minicurso_inscricoes';

export async function listEnrollmentCandidates(env = process.env) {
  const [leads, students, accesses] = await Promise.all([
    getRows(LEADS_TABLE, 'order=created_at.desc', env),
    getRows('user_profiles', 'user_type=eq.student', env),
    getRows('student_module_access', '', env)
  ]);
  const studentsByEmail = new Map(students.map(student => [normalizeEmail(student.email), student]));
  const modulesByStudent = new Map();

  for (const access of accesses) {
    const moduleIds = modulesByStudent.get(access.student_id) || [];
    moduleIds.push(access.module_id);
    modulesByStudent.set(access.student_id, moduleIds);
  }

  return leads.map(lead => {
    const student = studentsByEmail.get(normalizeEmail(lead.email));
    return {
      ...lead,
      student_id: student?.id || null,
      has_account: Boolean(student),
      module_ids: student ? (modulesByStudent.get(student.id) || []) : []
    };
  });
}

export async function enrollLeadInModule(leadId, moduleId, env = process.env) {
  if (!leadId || !moduleId) {
    const error = new Error('Inscrito e módulo são obrigatórios');
    error.statusCode = 400;
    throw error;
  }

  const lead = (await getRows(LEADS_TABLE, `id=eq.${encodeURIComponent(leadId)}`, env))[0];
  if (!lead) {
    const error = new Error('Inscrito não encontrado');
    error.statusCode = 404;
    throw error;
  }

  const email = normalizeEmail(lead.email);
  let student = (await getRows('user_profiles', `email=eq.${encodeURIComponent(email)}&user_type=eq.student`, env))[0];
  let temporaryPassword = null;

  if (!student) {
    temporaryPassword = createTemporaryPassword();
    student = await registerStudent({
      email,
      password: temporaryPassword,
      full_name: lead.name,
      send_welcome_email: true
    }, env);
  }

  await grantModuleToStudent(student.id, moduleId, env);
  return {
    success: true,
    student_id: student.id,
    account_created: Boolean(temporaryPassword),
    temporary_password: temporaryPassword
  };
}

async function getRows(table, query, env) {
  const supabaseUrl = String(env.SUPABASE_URL || '').replace(/\/$/, '');
  const serviceKey = String(env.SUPABASE_SERVICE_ROLE_KEY || '');
  if (!supabaseUrl || !serviceKey) {
    const error = new Error('Supabase não configurado');
    error.statusCode = 500;
    throw error;
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/${table}${query ? `?${query}` : ''}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
  });
  const text = await response.text();
  if (!response.ok) {
    const error = new Error(text || 'Erro ao consultar matrículas');
    error.statusCode = 502;
    throw error;
  }
  return text ? JSON.parse(text) : [];
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function createTemporaryPassword() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const token = Array.from(bytes, value => value.toString(36)).join('').slice(0, 12);
  return `GM!${token}a7`;
}
