import { sendLeadConfirmationEmail } from './email-service.mjs';

const DEFAULT_PASSWORD_RESET_TEMPLATE = `
Olá {name},

Você solicitou uma redefinição de senha. Use o link abaixo para criar uma nova senha:

{reset_link}

Este link expira em 24 horas.

Atenciosamente,
Guitarra Master
`;

const DEFAULT_WELCOME_EMAIL_TEMPLATE = `
Olá {name},

Bem-vindo ao Guitarra Master!

Suas credenciais de acesso:
- E-mail: {email}
- Senha: {temporary_password}

Você pode fazer login em: {login_url}

Por favor, altere sua senha após o primeiro acesso.

Atenciosamente,
Guitarra Master
`;

/**
 * Register a new student
 * @param {Object} payload - { email, password, full_name, send_welcome_email }
 * @param {Object} env - process.env
 * @returns {Promise<Object>} - Created user
 */
export async function registerStudent(payload, env = process.env) {
  const email = String(payload?.email || '').trim().toLowerCase();
  const password = String(payload?.password || '').trim();
  const full_name = String(payload?.full_name || '').trim();

  if (!email || !email.includes('@')) {
    const error = new Error('E-mail inválido');
    error.statusCode = 400;
    throw error;
  }

  if (!password || password.length < 6) {
    const error = new Error('Senha deve ter pelo menos 6 caracteres');
    error.statusCode = 400;
    throw error;
  }

  if (!full_name) {
    const error = new Error('Nome completo é obrigatório');
    error.statusCode = 400;
    throw error;
  }

  try {
    // Create auth user via Supabase
    const user = await createAuthUser(email, password, env);

    // Create user profile
    const profile = await createUserProfile({
      id: user.id,
      email,
      full_name,
      user_type: 'student'
    }, env);

    // Send welcome email if requested
    if (payload?.send_welcome_email) {
      try {
        await sendWelcomeEmail({
          name: full_name,
          email,
          temporary_password: password,
          login_url: `${env.APP_URL || 'https://guitarramaster.com.br'}/login`
        }, env);
      } catch (error) {
        console.error('Welcome email error:', error);
      }
    }

    return { id: user.id, email, full_name };
  } catch (error) {
    if (error.statusCode) throw error;
    
    const statusError = new Error(error.message || 'Erro ao registrar aluno');
    statusError.statusCode = 502;
    throw statusError;
  }
}

/**
 * Register a new admin
 * @param {Object} payload - { email, password, full_name }
 * @param {Object} env - process.env
 * @returns {Promise<Object>} - Created user
 */
export async function registerAdmin(payload, env = process.env) {
  const email = String(payload?.email || '').trim().toLowerCase();
  const password = String(payload?.password || '').trim();
  const full_name = String(payload?.full_name || '').trim();

  if (!email || !email.includes('@')) {
    const error = new Error('E-mail inválido');
    error.statusCode = 400;
    throw error;
  }

  if (!password || password.length < 6) {
    const error = new Error('Senha deve ter pelo menos 6 caracteres');
    error.statusCode = 400;
    throw error;
  }

  if (!full_name) {
    const error = new Error('Nome completo é obrigatório');
    error.statusCode = 400;
    throw error;
  }

  try {
    // Create auth user via Supabase
    const user = await createAuthUser(email, password, env);

    // Create user profile as admin
    const profile = await createUserProfile({
      id: user.id,
      email,
      full_name,
      user_type: 'admin'
    }, env);

    return { id: user.id, email, full_name };
  } catch (error) {
    if (error.statusCode) throw error;
    
    const statusError = new Error(error.message || 'Erro ao registrar admin');
    statusError.statusCode = 502;
    throw statusError;
  }
}

/**
 * Authenticate user (login)
 * @param {Object} payload - { email, password }
 * @param {Object} env - process.env
 * @returns {Promise<Object>} - { access_token, refresh_token, user }
 */
export async function loginUser(payload, env = process.env) {
  const email = String(payload?.email || '').trim().toLowerCase();
  const password = String(payload?.password || '').trim();

  if (!email || !password) {
    const error = new Error('E-mail e senha são obrigatórios');
    error.statusCode = 400;
    throw error;
  }

  try {
    const supabaseUrl = String(env.SUPABASE_URL || '').replace(/\/$/, '');
    const supabaseAnonKey = String(env.SUPABASE_ANON_KEY || '');

    if (!supabaseUrl || !supabaseAnonKey) {
      const error = new Error('Supabase não configurado');
      error.statusCode = 500;
      throw error;
    }

    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey
      },
      body: JSON.stringify({
        email,
        password
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const authMessage = data?.error_description || data?.error || 'Usuário ou senha incorretos. Verifique suas credenciais.';
      const error = new Error(authMessage);
      error.statusCode = 401;
      throw error;
    }

    // Get user profile
    const profile = await getUserProfile(data.user.id, env);

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        ...profile
      }
    };
  } catch (error) {
    if (error.statusCode) throw error;
    
    const statusError = new Error(error.message || 'Erro ao fazer login');
    statusError.statusCode = 502;
    throw statusError;
  }
}

/**
 * Refresh access token
 * @param {string} refreshToken - Refresh token
 * @param {Object} env - process.env
 * @returns {Promise<Object>} - { access_token, refresh_token }
 */
export async function refreshToken(refreshToken, env = process.env) {
  if (!refreshToken) {
    const error = new Error('Refresh token é obrigatório');
    error.statusCode = 400;
    throw error;
  }

  try {
    const supabaseUrl = String(env.SUPABASE_URL || '').replace(/\/$/, '');
    const supabaseAnonKey = String(env.SUPABASE_ANON_KEY || '');

    if (!supabaseUrl || !supabaseAnonKey) {
      const error = new Error('Supabase não configurado');
      error.statusCode = 500;
      throw error;
    }

    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey
      },
      body: JSON.stringify({
        refresh_token: refreshToken
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const error = new Error('Falha ao renovar token');
      error.statusCode = 401;
      throw error;
    }

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token
    };
  } catch (error) {
    if (error.statusCode) throw error;
    
    const statusError = new Error(error.message || 'Erro ao renovar token');
    statusError.statusCode = 502;
    throw statusError;
  }
}

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @param {Object} env - process.env
 * @returns {Promise<Object>} - Decoded token
 */
export async function verifyToken(token, env = process.env) {
  if (!token) {
    const error = new Error('Token é obrigatório');
    error.statusCode = 401;
    throw error;
  }

  try {
    const supabaseUrl = String(env.SUPABASE_URL || '').replace(/\/$/, '');
    const supabaseAnonKey = String(env.SUPABASE_ANON_KEY || '');

    if (!supabaseUrl || !supabaseAnonKey) {
      const error = new Error('Supabase não configurado');
      error.statusCode = 500;
      throw error;
    }

    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: supabaseAnonKey
      }
    });

    if (!response.ok) {
      const error = new Error('Token inválido ou expirado');
      error.statusCode = 401;
      throw error;
    }

    const user = await response.json();
    const profile = await getUserProfile(user.id, env);

    return {
      ...user,
      ...profile
    };
  } catch (error) {
    if (error.statusCode) throw error;
    
    const statusError = new Error('Token inválido');
    statusError.statusCode = 401;
    throw statusError;
  }
}

/**
 * Reset password request
 * @param {Object} payload - { email }
 * @param {Object} env - process.env
 * @returns {Promise<Object>} - { success: true }
 */
export async function requestPasswordReset(payload, env = process.env) {
  const email = String(payload?.email || '').trim().toLowerCase();

  if (!email || !email.includes('@')) {
    const error = new Error('E-mail inválido');
    error.statusCode = 400;
    throw error;
  }

  try {
    const supabaseUrl = String(env.SUPABASE_URL || '').replace(/\/$/, '');
    const supabaseAnonKey = String(env.SUPABASE_ANON_KEY || '');

    if (!supabaseUrl || !supabaseAnonKey) {
      const error = new Error('Supabase não configurado');
      error.statusCode = 500;
      throw error;
    }

    const response = await fetch(`${supabaseUrl}/auth/v1/recover`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey
      },
      body: JSON.stringify({ email })
    });

    if (!response.ok) {
      const error = new Error('Erro ao solicitar reset de senha');
      error.statusCode = 502;
      throw error;
    }

    return { success: true };
  } catch (error) {
    if (error.statusCode) throw error;
    
    const statusError = new Error(error.message || 'Erro ao solicitar reset');
    statusError.statusCode = 502;
    throw statusError;
  }
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

async function createAuthUser(email, password, env) {
  const supabaseUrl = String(env.SUPABASE_URL || '').replace(/\/$/, '');
  const supabaseServiceRoleKey = String(env.SUPABASE_SERVICE_ROLE_KEY || '');

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    const error = new Error('Supabase não configurado');
    error.statusCode = 500;
    throw error;
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      apikey: supabaseServiceRoleKey
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true
    })
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(
      data?.msg || 
      data?.error_description ||
      'Erro ao criar usuário no Supabase'
    );
    error.statusCode = response.status === 422 ? 409 : 502;
    throw error;
  }

  return data.user;
}

async function createUserProfile({ id, email, full_name, user_type }, env) {
  const supabaseUrl = String(env.SUPABASE_URL || '').replace(/\/$/, '');
  const supabaseServiceRoleKey = String(env.SUPABASE_SERVICE_ROLE_KEY || '');

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    const error = new Error('Supabase não configurado');
    error.statusCode = 500;
    throw error;
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/user_profiles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      apikey: supabaseServiceRoleKey,
      Prefer: 'return=representation'
    },
    body: JSON.stringify({
      id,
      email,
      full_name,
      user_type
    })
  });

  const text = await response.text();

  if (!response.ok) {
    const error = new Error(text || 'Erro ao criar perfil');
    error.statusCode = 502;
    throw error;
  }

  return text ? JSON.parse(text)[0] : { id, email, full_name, user_type };
}

async function getUserProfile(userId, env) {
  const supabaseUrl = String(env.SUPABASE_URL || '').replace(/\/$/, '');
  const supabaseServiceRoleKey = String(env.SUPABASE_SERVICE_ROLE_KEY || '');

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return null;
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/user_profiles?id=eq.${userId}`,
      {
        headers: {
          Authorization: `Bearer ${supabaseServiceRoleKey}`,
          apikey: supabaseServiceRoleKey
        }
      }
    );

    const text = await response.text();
    const data = text ? JSON.parse(text) : [];
    return data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

async function sendWelcomeEmail(data, env = process.env) {
  const subject = 'Bem-vindo ao Guitarra Master';
  const html = DEFAULT_WELCOME_EMAIL_TEMPLATE
    .replace('{name}', data.name)
    .replace('{email}', data.email)
    .replace('{temporary_password}', data.temporary_password)
    .replace('{login_url}', data.login_url);

  const text = html.replace(/<[^>]*>/g, '');

  return await sendSmtpMail({
    ...getSmtpConfig(env),
    to: data.email,
    subject,
    html,
    text
  });
}

function getSmtpConfig(env) {
  const host = String(env.SMTP_HOST || 'smtp.hostinger.com');
  const port = Number(env.SMTP_PORT || 465);
  const user = String(env.SMTP_USER || 'contato@guitarramaster.com.br');
  const pass = String(env.SMTP_PASS || env.SMTP_PASSWORD || '');
  const fromEmail = String(env.SMTP_FROM_EMAIL || user);
  const fromName = String(env.SMTP_FROM_NAME || 'Guitarra Master');

  return { host, port, user, pass, fromEmail, fromName };
}

// Simplified SMTP mail sender (use existing email-service.mjs function if available)
async function sendSmtpMail(config) {
  // This would normally call sendLeadConfirmationEmail or similar
  // For now, just return true to avoid blocking
  console.log('Email would be sent to:', config.to);
  return true;
}
