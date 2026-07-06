/**
 * Module Service
 * Handles CRUD operations for learning modules
 */

export async function createModule(payload, userId, env = process.env) {
  const title = String(payload?.title || '').trim();
  const description = String(payload?.description || '').trim();
  const order_index = Number(payload?.order_index || 0);

  if (!title) {
    const error = new Error('Título do módulo é obrigatório');
    error.statusCode = 400;
    throw error;
  }

  try {
    const module = {
      title,
      description,
      order_index,
      admin_id: userId,
      active: true
    };

    return await saveToSupabase('modules', module, env);
  } catch (error) {
    if (error.statusCode) throw error;
    
    const statusError = new Error('Erro ao criar módulo');
    statusError.statusCode = 502;
    throw statusError;
  }
}

export async function updateModule(moduleId, payload, env = process.env) {
  if (!moduleId) {
    const error = new Error('ID do módulo é obrigatório');
    error.statusCode = 400;
    throw error;
  }

  const updates = {};
  
  if (payload?.title !== undefined) {
    updates.title = String(payload.title).trim();
    if (!updates.title) {
      const error = new Error('Título não pode ser vazio');
      error.statusCode = 400;
      throw error;
    }
  }

  if (payload?.description !== undefined) {
    updates.description = String(payload.description).trim();
  }

  if (payload?.order_index !== undefined) {
    updates.order_index = Number(payload.order_index);
  }

  if (payload?.active !== undefined) {
    updates.active = Boolean(payload.active);
  }

  updates.updated_at = new Date().toISOString();

  try {
    return await updateInSupabase('modules', moduleId, updates, env);
  } catch (error) {
    if (error.statusCode) throw error;
    
    const statusError = new Error('Erro ao atualizar módulo');
    statusError.statusCode = 502;
    throw statusError;
  }
}

export async function getModule(moduleId, env = process.env) {
  if (!moduleId) {
    const error = new Error('ID do módulo é obrigatório');
    error.statusCode = 400;
    throw error;
  }

  try {
    return await getFromSupabase('modules', `id=eq.${moduleId}`, env);
  } catch (error) {
    if (error.statusCode) throw error;
    
    const statusError = new Error('Erro ao buscar módulo');
    statusError.statusCode = 502;
    throw statusError;
  }
}

export async function getModules(filters = {}, env = process.env) {
  try {
    let query = '';

    if (filters.admin_id) {
      query += `admin_id=eq.${filters.admin_id}&`;
    }

    if (filters.active !== undefined) {
      query += `active=eq.${filters.active}&`;
    }

    if (filters.order_by) {
      query += `order=${filters.order_by}`;
    }

    return await getFromSupabase('modules', query, env, true);
  } catch (error) {
    if (error.statusCode) throw error;
    
    const statusError = new Error('Erro ao listar módulos');
    statusError.statusCode = 502;
    throw statusError;
  }
}

export async function deleteModule(moduleId, env = process.env) {
  if (!moduleId) {
    const error = new Error('ID do módulo é obrigatório');
    error.statusCode = 400;
    throw error;
  }

  try {
    return await deleteFromSupabase('modules', moduleId, env);
  } catch (error) {
    if (error.statusCode) throw error;
    
    const statusError = new Error('Erro ao deletar módulo');
    statusError.statusCode = 502;
    throw statusError;
  }
}

// ============================================================================
// HELPERS
// ============================================================================

async function saveToSupabase(table, data, env) {
  const supabaseUrl = String(env.SUPABASE_URL || '').replace(/\/$/, '');
  const supabaseServiceRoleKey = String(env.SUPABASE_SERVICE_ROLE_KEY || '');

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    const error = new Error('Supabase não configurado');
    error.statusCode = 500;
    throw error;
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      apikey: supabaseServiceRoleKey,
      Prefer: 'return=representation'
    },
    body: JSON.stringify(data)
  });

  const text = await response.text();

  if (!response.ok) {
    const error = new Error(text || `Erro ao salvar em ${table}`);
    error.statusCode = 502;
    throw error;
  }

  return text ? JSON.parse(text)[0] : data;
}

async function updateInSupabase(table, id, data, env) {
  const supabaseUrl = String(env.SUPABASE_URL || '').replace(/\/$/, '');
  const supabaseServiceRoleKey = String(env.SUPABASE_SERVICE_ROLE_KEY || '');

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    const error = new Error('Supabase não configurado');
    error.statusCode = 500;
    throw error;
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      apikey: supabaseServiceRoleKey,
      Prefer: 'return=representation'
    },
    body: JSON.stringify(data)
  });

  const text = await response.text();

  if (!response.ok) {
    const error = new Error(text || `Erro ao atualizar em ${table}`);
    error.statusCode = 502;
    throw error;
  }

  return text ? JSON.parse(text)[0] : { ...data, id };
}

async function getFromSupabase(table, query, env, returnArray = false) {
  const supabaseUrl = String(env.SUPABASE_URL || '').replace(/\/$/, '');
  const supabaseServiceRoleKey = String(env.SUPABASE_SERVICE_ROLE_KEY || '');

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    const error = new Error('Supabase não configurado');
    error.statusCode = 500;
    throw error;
  }

  const url = `${supabaseUrl}/rest/v1/${table}?${query}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      apikey: supabaseServiceRoleKey
    }
  });

  const text = await response.text();

  if (!response.ok) {
    const error = new Error(text || `Erro ao buscar de ${table}`);
    error.statusCode = 502;
    throw error;
  }

  const data = text ? JSON.parse(text) : [];
  return returnArray ? data : (data.length > 0 ? data[0] : null);
}

async function deleteFromSupabase(table, id, env) {
  const supabaseUrl = String(env.SUPABASE_URL || '').replace(/\/$/, '');
  const supabaseServiceRoleKey = String(env.SUPABASE_SERVICE_ROLE_KEY || '');

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    const error = new Error('Supabase não configurado');
    error.statusCode = 500;
    throw error;
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?id=eq.${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      apikey: supabaseServiceRoleKey
    }
  });

  if (!response.ok) {
    const text = await response.text();
    const error = new Error(text || `Erro ao deletar de ${table}`);
    error.statusCode = 502;
    throw error;
  }

  return { success: true };
}
