/**
 * Student & Class Management Service
 */

// ============================================================================
// STUDENT MANAGEMENT
// ============================================================================

export async function getStudents(filters = {}, env = process.env) {
  try {
    let query = 'user_type=eq.student';

    if (filters.active !== undefined) {
      query += `&active=eq.${filters.active}`;
    }

    if (filters.class_id) {
      // Get students by class membership
      return await getStudentsByClass(filters.class_id, env);
    }

    return await getFromSupabase('user_profiles', query, env, true);
  } catch (error) {
    if (error.statusCode) throw error;

    const statusError = new Error('Erro ao listar alunos');
    statusError.statusCode = 502;
    throw statusError;
  }
}

export async function getStudent(studentId, env = process.env) {
  if (!studentId) {
    const error = new Error('ID do aluno é obrigatório');
    error.statusCode = 400;
    throw error;
  }

  try {
    return await getFromSupabase('user_profiles', `id=eq.${studentId}&user_type=eq.student`, env);
  } catch (error) {
    if (error.statusCode) throw error;

    const statusError = new Error('Erro ao buscar aluno');
    statusError.statusCode = 502;
    throw statusError;
  }
}

export async function updateStudent(studentId, payload, env = process.env) {
  if (!studentId) {
    const error = new Error('ID do aluno é obrigatório');
    error.statusCode = 400;
    throw error;
  }

  const updates = {};

  if (payload?.full_name !== undefined) {
    updates.full_name = String(payload.full_name).trim();
  }

  if (payload?.active !== undefined) {
    updates.active = Boolean(payload.active);
  }

  if (payload?.avatar_url !== undefined) {
    updates.avatar_url = String(payload.avatar_url).trim();
  }

  updates.updated_at = new Date().toISOString();

  try {
    return await updateInSupabase('user_profiles', studentId, updates, env);
  } catch (error) {
    if (error.statusCode) throw error;

    const statusError = new Error('Erro ao atualizar aluno');
    statusError.statusCode = 502;
    throw statusError;
  }
}

export async function getStudentModules(studentId, env = process.env) {
  if (!studentId) {
    const error = new Error('ID do aluno é obrigatório');
    error.statusCode = 400;
    throw error;
  }

  try {
    // Get modules assigned directly to student
    const directModules = await getFromSupabase(
      'student_module_access',
      `student_id=eq.${studentId}`,
      env,
      true
    );

    // Get modules assigned via class
    const classModules = await fetchSupabase(
      `select distinct m.* from public.modules m
       join public.class_module_access cma on m.id = cma.module_id
       join public.student_class_membership scm on cma.class_id = scm.class_id
       where scm.student_id = '${studentId}'`,
      env
    );

    // Combine and deduplicate
    const moduleIds = new Set();
    const modules = [];

    // Add from direct assignments
    for (const access of directModules) {
      moduleIds.add(access.module_id);
    }

    // Add from class assignments
    for (const module of classModules) {
      if (!moduleIds.has(module.id)) {
        modules.push(module);
        moduleIds.add(module.id);
      }
    }

    // Fetch full module details for direct assignments
    for (const moduleId of moduleIds) {
      const module = await getFromSupabase('modules', `id=eq.${moduleId}`, env);
      if (module && !modules.find(m => m.id === module.id)) {
        modules.push(module);
      }
    }

    return modules;
  } catch (error) {
    if (error.statusCode) throw error;

    const statusError = new Error('Erro ao buscar módulos do aluno');
    statusError.statusCode = 502;
    throw statusError;
  }
}

// ============================================================================
// STUDENT MODULE ACCESS
// ============================================================================

export async function grantModuleToStudent(studentId, moduleId, env = process.env) {
  if (!studentId || !moduleId) {
    const error = new Error('ID do aluno e módulo são obrigatórios');
    error.statusCode = 400;
    throw error;
  }

  try {
    const access = {
      student_id: studentId,
      module_id: moduleId
    };

    return await saveToSupabase('student_module_access', access, env);
  } catch (error) {
    // Handle duplicate key error gracefully
    if (error.message && error.message.includes('duplicate')) {
      return { success: true, message: 'Acesso já existente' };
    }

    if (error.statusCode) throw error;

    const statusError = new Error('Erro ao conceder acesso ao módulo');
    statusError.statusCode = 502;
    throw statusError;
  }
}

export async function revokeModuleFromStudent(studentId, moduleId, env = process.env) {
  if (!studentId || !moduleId) {
    const error = new Error('ID do aluno e módulo são obrigatórios');
    error.statusCode = 400;
    throw error;
  }

  try {
    const supabaseUrl = String(env.SUPABASE_URL || '').replace(/\/$/, '');
    const supabaseServiceRoleKey = String(env.SUPABASE_SERVICE_ROLE_KEY || '');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      const error = new Error('Supabase não configurado');
      error.statusCode = 500;
      throw error;
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/student_module_access?student_id=eq.${studentId}&module_id=eq.${moduleId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${supabaseServiceRoleKey}`,
          apikey: supabaseServiceRoleKey
        }
      }
    );

    if (!response.ok) {
      const text = await response.text();
      const error = new Error(text || 'Erro ao revogar acesso');
      error.statusCode = 502;
      throw error;
    }

    return { success: true };
  } catch (error) {
    if (error.statusCode) throw error;

    const statusError = new Error('Erro ao revogar acesso do aluno');
    statusError.statusCode = 502;
    throw statusError;
  }
}

// ============================================================================
// CLASS MANAGEMENT
// ============================================================================

export async function createClass(payload, adminId, env = process.env) {
  const name = String(payload?.name || '').trim();
  const description = String(payload?.description || '').trim();

  if (!name) {
    const error = new Error('Nome da turma é obrigatório');
    error.statusCode = 400;
    throw error;
  }

  try {
    const classGroup = {
      name,
      description,
      admin_id: adminId,
      active: true
    };

    return await saveToSupabase('class_groups', classGroup, env);
  } catch (error) {
    if (error.statusCode) throw error;

    const statusError = new Error('Erro ao criar turma');
    statusError.statusCode = 502;
    throw statusError;
  }
}

export async function updateClass(classId, payload, env = process.env) {
  if (!classId) {
    const error = new Error('ID da turma é obrigatório');
    error.statusCode = 400;
    throw error;
  }

  const updates = {};

  if (payload?.name !== undefined) {
    updates.name = String(payload.name).trim();
    if (!updates.name) {
      const error = new Error('Nome não pode ser vazio');
      error.statusCode = 400;
      throw error;
    }
  }

  if (payload?.description !== undefined) {
    updates.description = String(payload.description).trim();
  }

  if (payload?.active !== undefined) {
    updates.active = Boolean(payload.active);
  }

  updates.updated_at = new Date().toISOString();

  try {
    return await updateInSupabase('class_groups', classId, updates, env);
  } catch (error) {
    if (error.statusCode) throw error;

    const statusError = new Error('Erro ao atualizar turma');
    statusError.statusCode = 502;
    throw statusError;
  }
}

export async function getClass(classId, env = process.env) {
  if (!classId) {
    const error = new Error('ID da turma é obrigatório');
    error.statusCode = 400;
    throw error;
  }

  try {
    return await getFromSupabase('class_groups', `id=eq.${classId}`, env);
  } catch (error) {
    if (error.statusCode) throw error;

    const statusError = new Error('Erro ao buscar turma');
    statusError.statusCode = 502;
    throw statusError;
  }
}

export async function getClasses(adminId, env = process.env) {
  try {
    return await getFromSupabase('class_groups', `admin_id=eq.${adminId}`, env, true);
  } catch (error) {
    if (error.statusCode) throw error;

    const statusError = new Error('Erro ao listar turmas');
    statusError.statusCode = 502;
    throw statusError;
  }
}

export async function deleteClass(classId, env = process.env) {
  if (!classId) {
    const error = new Error('ID da turma é obrigatório');
    error.statusCode = 400;
    throw error;
  }

  try {
    return await deleteFromSupabase('class_groups', classId, env);
  } catch (error) {
    if (error.statusCode) throw error;

    const statusError = new Error('Erro ao deletar turma');
    statusError.statusCode = 502;
    throw statusError;
  }
}

// ============================================================================
// CLASS MEMBERS
// ============================================================================

export async function addStudentToClass(classId, studentId, env = process.env) {
  if (!classId || !studentId) {
    const error = new Error('ID da turma e aluno são obrigatórios');
    error.statusCode = 400;
    throw error;
  }

  try {
    const membership = {
      class_id: classId,
      student_id: studentId
    };

    return await saveToSupabase('student_class_membership', membership, env);
  } catch (error) {
    if (error.message && error.message.includes('duplicate')) {
      return { success: true, message: 'Aluno já pertence à turma' };
    }

    if (error.statusCode) throw error;

    const statusError = new Error('Erro ao adicionar aluno à turma');
    statusError.statusCode = 502;
    throw statusError;
  }
}

export async function removeStudentFromClass(classId, studentId, env = process.env) {
  if (!classId || !studentId) {
    const error = new Error('ID da turma e aluno são obrigatórios');
    error.statusCode = 400;
    throw error;
  }

  try {
    const supabaseUrl = String(env.SUPABASE_URL || '').replace(/\/$/, '');
    const supabaseServiceRoleKey = String(env.SUPABASE_SERVICE_ROLE_KEY || '');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      const error = new Error('Supabase não configurado');
      error.statusCode = 500;
      throw error;
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/student_class_membership?class_id=eq.${classId}&student_id=eq.${studentId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${supabaseServiceRoleKey}`,
          apikey: supabaseServiceRoleKey
        }
      }
    );

    if (!response.ok) {
      const text = await response.text();
      const error = new Error(text || 'Erro ao remover aluno');
      error.statusCode = 502;
      throw error;
    }

    return { success: true };
  } catch (error) {
    if (error.statusCode) throw error;

    const statusError = new Error('Erro ao remover aluno da turma');
    statusError.statusCode = 502;
    throw statusError;
  }
}

export async function getClassMembers(classId, env = process.env) {
  if (!classId) {
    const error = new Error('ID da turma é obrigatório');
    error.statusCode = 400;
    throw error;
  }

  try {
    const memberships = await getFromSupabase(
      'student_class_membership',
      `class_id=eq.${classId}`,
      env,
      true
    );

    // Fetch student details for each membership
    const students = [];
    for (const membership of memberships) {
      const student = await getFromSupabase('user_profiles', `id=eq.${membership.student_id}`, env);
      if (student) {
        students.push(student);
      }
    }

    return students;
  } catch (error) {
    if (error.statusCode) throw error;

    const statusError = new Error('Erro ao listar membros da turma');
    statusError.statusCode = 502;
    throw statusError;
  }
}

// ============================================================================
// CLASS MODULE ACCESS
// ============================================================================

export async function grantModuleToClass(classId, moduleId, env = process.env) {
  if (!classId || !moduleId) {
    const error = new Error('ID da turma e módulo são obrigatórios');
    error.statusCode = 400;
    throw error;
  }

  try {
    const access = {
      class_id: classId,
      module_id: moduleId
    };

    return await saveToSupabase('class_module_access', access, env);
  } catch (error) {
    if (error.message && error.message.includes('duplicate')) {
      return { success: true, message: 'Módulo já foi liberado para esta turma' };
    }

    if (error.statusCode) throw error;

    const statusError = new Error('Erro ao liberar módulo para turma');
    statusError.statusCode = 502;
    throw statusError;
  }
}

export async function revokeModuleFromClass(classId, moduleId, env = process.env) {
  if (!classId || !moduleId) {
    const error = new Error('ID da turma e módulo são obrigatórios');
    error.statusCode = 400;
    throw error;
  }

  try {
    const supabaseUrl = String(env.SUPABASE_URL || '').replace(/\/$/, '');
    const supabaseServiceRoleKey = String(env.SUPABASE_SERVICE_ROLE_KEY || '');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      const error = new Error('Supabase não configurado');
      error.statusCode = 500;
      throw error;
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/class_module_access?class_id=eq.${classId}&module_id=eq.${moduleId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${supabaseServiceRoleKey}`,
          apikey: supabaseServiceRoleKey
        }
      }
    );

    if (!response.ok) {
      const text = await response.text();
      const error = new Error(text || 'Erro ao revogar módulo');
      error.statusCode = 502;
      throw error;
    }

    return { success: true };
  } catch (error) {
    if (error.statusCode) throw error;

    const statusError = new Error('Erro ao revogar módulo da turma');
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

async function getStudentsByClass(classId, env) {
  const memberships = await getFromSupabase(
    'student_class_membership',
    `class_id=eq.${classId}`,
    env,
    true
  );

  const students = [];
  for (const membership of memberships) {
    const student = await getFromSupabase('user_profiles', `id=eq.${membership.student_id}`, env);
    if (student) {
      students.push(student);
    }
  }

  return students;
}

async function fetchSupabase(sql, env) {
  // This would use RPC if the Supabase supports it, otherwise we'd need to refactor
  // For now, return empty array as a fallback
  return [];
}
