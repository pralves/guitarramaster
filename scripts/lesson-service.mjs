/**
 * Lesson Service
 * Handles CRUD operations for lessons and related content
 */

export async function createLesson(payload, moduleId, userId, env = process.env) {
  const title = String(payload?.title || '').trim();
  const description = String(payload?.description || '').trim();
  const content = String(payload?.content || '').trim();
  const order_index = Number(payload?.order_index || 0);
  const active = payload?.active !== undefined ? Boolean(payload.active) : true;

  if (!title) {
    const error = new Error('Título da aula é obrigatório');
    error.statusCode = 400;
    throw error;
  }

  if (!moduleId) {
    const error = new Error('ID do módulo é obrigatório');
    error.statusCode = 400;
    throw error;
  }

  try {
    const lesson = {
      title,
      description,
      content,
      order_index,
      module_id: moduleId,
      admin_id: userId,
      active
    };

    return await saveToSupabase('lessons', lesson, env);
  } catch (error) {
    if (error.statusCode) throw error;
    
    const statusError = new Error('Erro ao criar aula');
    statusError.statusCode = 502;
    throw statusError;
  }
}

export async function updateLesson(lessonId, payload, env = process.env) {
  if (!lessonId) {
    const error = new Error('ID da aula é obrigatório');
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

  if (payload?.content !== undefined) {
    updates.content = String(payload.content).trim();
  }

  if (payload?.module_id !== undefined) {
    updates.module_id = String(payload.module_id).trim();
  }

  if (payload?.order_index !== undefined) {
    updates.order_index = Number(payload.order_index);
  }

  if (payload?.active !== undefined) {
    updates.active = Boolean(payload.active);
  }

  updates.updated_at = new Date().toISOString();

  try {
    return await updateInSupabase('lessons', lessonId, updates, env);
  } catch (error) {
    if (error.statusCode) throw error;
    
    const statusError = new Error('Erro ao atualizar aula');
    statusError.statusCode = 502;
    throw statusError;
  }
}

export async function getLesson(lessonId, env = process.env) {
  if (!lessonId) {
    const error = new Error('ID da aula é obrigatório');
    error.statusCode = 400;
    throw error;
  }

  try {
    return await getFromSupabase('lessons', `id=eq.${lessonId}`, env);
  } catch (error) {
    if (error.statusCode) throw error;
    
    const statusError = new Error('Erro ao buscar aula');
    statusError.statusCode = 502;
    throw statusError;
  }
}

export async function getLessonsByModule(moduleId, env = process.env) {
  if (!moduleId) {
    const error = new Error('ID do módulo é obrigatório');
    error.statusCode = 400;
    throw error;
  }

  try {
    return await getFromSupabase(
      'lessons',
      `module_id=eq.${moduleId}&order=order_index`,
      env,
      true
    );
  } catch (error) {
    if (error.statusCode) throw error;
    
    const statusError = new Error('Erro ao listar aulas');
    statusError.statusCode = 502;
    throw statusError;
  }
}

export async function deleteLesson(lessonId, env = process.env) {
  if (!lessonId) {
    const error = new Error('ID da aula é obrigatório');
    error.statusCode = 400;
    throw error;
  }

  try {
    return await deleteFromSupabase('lessons', lessonId, env);
  } catch (error) {
    if (error.statusCode) throw error;
    
    const statusError = new Error('Erro ao deletar aula');
    statusError.statusCode = 502;
    throw statusError;
  }
}

// ============================================================================
// LESSON VIDEOS
// ============================================================================

export async function addLessonVideo(lessonId, fileData, env = process.env) {
  if (!lessonId) {
    const error = new Error('ID da aula é obrigatório');
    error.statusCode = 400;
    throw error;
  }

  const { file_name, file_size, file_path, duration_seconds } = fileData;

  if (!file_name || !file_path) {
    const error = new Error('Nome e caminho do arquivo são obrigatórios');
    error.statusCode = 400;
    throw error;
  }

  try {
    const video = {
      lesson_id: lessonId,
      file_name,
      file_size: file_size || 0,
      file_path,
      duration_seconds: duration_seconds || 0
    };

    return await saveToSupabase('lesson_videos', video, env);
  } catch (error) {
    if (error.statusCode) throw error;
    
    const statusError = new Error('Erro ao adicionar vídeo');
    statusError.statusCode = 502;
    throw statusError;
  }
}

export async function getLessonVideos(lessonId, env = process.env) {
  if (!lessonId) {
    const error = new Error('ID da aula é obrigatório');
    error.statusCode = 400;
    throw error;
  }

  try {
    return await getFromSupabase(
      'lesson_videos',
      `lesson_id=eq.${lessonId}`,
      env,
      true
    );
  } catch (error) {
    if (error.statusCode) throw error;
    
    const statusError = new Error('Erro ao buscar vídeos');
    statusError.statusCode = 502;
    throw statusError;
  }
}

// ============================================================================
// LESSON MATERIALS (PDFs, etc)
// ============================================================================

export async function addLessonMaterial(lessonId, fileData, env = process.env) {
  if (!lessonId) {
    const error = new Error('ID da aula é obrigatório');
    error.statusCode = 400;
    throw error;
  }

  const { title, file_name, file_size, file_path, material_type } = fileData;

  if (!title || !file_name || !file_path) {
    const error = new Error('Título, nome e caminho do arquivo são obrigatórios');
    error.statusCode = 400;
    throw error;
  }

  try {
    const material = {
      lesson_id: lessonId,
      title,
      file_name,
      file_size: file_size || 0,
      file_path,
      material_type: material_type || 'pdf'
    };

    return await saveToSupabase('lesson_materials', material, env);
  } catch (error) {
    if (error.statusCode) throw error;
    
    const statusError = new Error('Erro ao adicionar material');
    statusError.statusCode = 502;
    throw statusError;
  }
}

export async function getLessonMaterials(lessonId, env = process.env) {
  if (!lessonId) {
    const error = new Error('ID da aula é obrigatório');
    error.statusCode = 400;
    throw error;
  }

  try {
    return await getFromSupabase(
      'lesson_materials',
      `lesson_id=eq.${lessonId}`,
      env,
      true
    );
  } catch (error) {
    if (error.statusCode) throw error;
    
    const statusError = new Error('Erro ao buscar materiais');
    statusError.statusCode = 502;
    throw statusError;
  }
}

// ============================================================================
// LESSON EXERCISES
// ============================================================================

export async function createExercise(lessonId, payload, env = process.env) {
  const title = String(payload?.title || '').trim();
  const description = String(payload?.description || '').trim();
  const content = String(payload?.content || '').trim();
  const order_index = Number(payload?.order_index || 0);

  if (!lessonId) {
    const error = new Error('ID da aula Ã© obrigatÃ³rio');
    error.statusCode = 400;
    throw error;
  }

  if (!title) {
    const error = new Error('TÃ­tulo do exercÃ­cio Ã© obrigatÃ³rio');
    error.statusCode = 400;
    throw error;
  }

  try {
    return await saveToSupabase('exercises', {
      lesson_id: lessonId,
      title,
      description,
      content,
      order_index
    }, env);
  } catch (error) {
    if (error.statusCode) throw error;

    const statusError = new Error('Erro ao criar exercÃ­cio');
    statusError.statusCode = 502;
    throw statusError;
  }
}

export async function updateExercise(exerciseId, payload, env = process.env) {
  if (!exerciseId) {
    const error = new Error('ID do exercÃ­cio Ã© obrigatÃ³rio');
    error.statusCode = 400;
    throw error;
  }

  const updates = {};

  if (payload?.title !== undefined) {
    updates.title = String(payload.title).trim();
    if (!updates.title) {
      const error = new Error('TÃ­tulo do exercÃ­cio nÃ£o pode ser vazio');
      error.statusCode = 400;
      throw error;
    }
  }

  if (payload?.description !== undefined) {
    updates.description = String(payload.description).trim();
  }

  if (payload?.content !== undefined) {
    updates.content = String(payload.content).trim();
  }

  if (payload?.order_index !== undefined) {
    updates.order_index = Number(payload.order_index);
  }

  updates.updated_at = new Date().toISOString();

  try {
    return await updateInSupabase('exercises', exerciseId, updates, env);
  } catch (error) {
    if (error.statusCode) throw error;

    const statusError = new Error('Erro ao atualizar exercÃ­cio');
    statusError.statusCode = 502;
    throw statusError;
  }
}

export async function getLessonExercises(lessonId, env = process.env) {
  if (!lessonId) {
    const error = new Error('ID da aula Ã© obrigatÃ³rio');
    error.statusCode = 400;
    throw error;
  }

  try {
    return await getFromSupabase(
      'exercises',
      `lesson_id=eq.${lessonId}&order=order_index`,
      env,
      true
    );
  } catch (error) {
    if (error.statusCode) throw error;

    const statusError = new Error('Erro ao listar exercÃ­cios');
    statusError.statusCode = 502;
    throw statusError;
  }
}

export async function deleteExercise(exerciseId, env = process.env) {
  if (!exerciseId) {
    const error = new Error('ID do exercÃ­cio Ã© obrigatÃ³rio');
    error.statusCode = 400;
    throw error;
  }

  try {
    return await deleteFromSupabase('exercises', exerciseId, env);
  } catch (error) {
    if (error.statusCode) throw error;

    const statusError = new Error('Erro ao deletar exercÃ­cio');
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
