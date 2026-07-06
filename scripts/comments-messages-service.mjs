/**
 * Comments & Messages Service
 */

// ============================================================================
// LESSON COMMENTS
// ============================================================================

export async function createLessonComment(lessonId, userId, payload, env = process.env) {
  const content = String(payload?.content || '').trim();
  const parent_comment_id = payload?.parent_comment_id;

  if (!lessonId || !userId) {
    const error = new Error('ID da aula e usuário são obrigatórios');
    error.statusCode = 400;
    throw error;
  }

  if (!content) {
    const error = new Error('Conteúdo do comentário é obrigatório');
    error.statusCode = 400;
    throw error;
  }

  try {
    const comment = {
      lesson_id: lessonId,
      student_id: userId,
      content,
      status: 'pending'
    };

    if (parent_comment_id) {
      comment.parent_comment_id = parent_comment_id;
    }

    return await saveToSupabase('lesson_comments', comment, env);
  } catch (error) {
    if (error.statusCode) throw error;

    const statusError = new Error('Erro ao criar comentário');
    statusError.statusCode = 502;
    throw statusError;
  }
}

export async function getLessonComments(lessonId, env = process.env) {
  if (!lessonId) {
    const error = new Error('ID da aula é obrigatório');
    error.statusCode = 400;
    throw error;
  }

  try {
    return await getFromSupabase(
      'lesson_comments',
      `lesson_id=eq.${lessonId}&status=eq.approved&order=created_at.desc`,
      env,
      true
    );
  } catch (error) {
    if (error.statusCode) throw error;

    const statusError = new Error('Erro ao listar comentários');
    statusError.statusCode = 502;
    throw statusError;
  }
}

export async function getCommentsPendingModeration(lessonId, env = process.env) {
  if (!lessonId) {
    const error = new Error('ID da aula é obrigatório');
    error.statusCode = 400;
    throw error;
  }

  try {
    return await getFromSupabase(
      'lesson_comments',
      `lesson_id=eq.${lessonId}&status=eq.pending&order=created_at.desc`,
      env,
      true
    );
  } catch (error) {
    if (error.statusCode) throw error;

    const statusError = new Error('Erro ao listar comentários');
    statusError.statusCode = 502;
    throw statusError;
  }
}

export async function approveComment(commentId, env = process.env) {
  if (!commentId) {
    const error = new Error('ID do comentário é obrigatório');
    error.statusCode = 400;
    throw error;
  }

  try {
    return await updateInSupabase('lesson_comments', commentId, { status: 'approved' }, env);
  } catch (error) {
    if (error.statusCode) throw error;

    const statusError = new Error('Erro ao aprovar comentário');
    statusError.statusCode = 502;
    throw statusError;
  }
}

export async function hideComment(commentId, env = process.env) {
  if (!commentId) {
    const error = new Error('ID do comentário é obrigatório');
    error.statusCode = 400;
    throw error;
  }

  try {
    return await updateInSupabase('lesson_comments', commentId, { status: 'hidden' }, env);
  } catch (error) {
    if (error.statusCode) throw error;

    const statusError = new Error('Erro ao ocultar comentário');
    statusError.statusCode = 502;
    throw statusError;
  }
}

export async function deleteComment(commentId, env = process.env) {
  if (!commentId) {
    const error = new Error('ID do comentário é obrigatório');
    error.statusCode = 400;
    throw error;
  }

  try {
    return await deleteFromSupabase('lesson_comments', commentId, env);
  } catch (error) {
    if (error.statusCode) throw error;

    const statusError = new Error('Erro ao deletar comentário');
    statusError.statusCode = 502;
    throw statusError;
  }
}

// ============================================================================
// MESSAGES
// ============================================================================

export async function sendMessage(payload, senderId, env = process.env) {
  const subject = String(payload?.subject || '').trim();
  const body = String(payload?.body || '').trim();
  const message_type = String(payload?.message_type || 'direct');
  const recipients = payload?.recipients || [];

  if (!body) {
    const error = new Error('Corpo da mensagem é obrigatório');
    error.statusCode = 400;
    throw error;
  }

  if (!Array.isArray(recipients) || recipients.length === 0) {
    const error = new Error('Pelo menos um destinatário é obrigatório');
    error.statusCode = 400;
    throw error;
  }

  try {
    const message = {
      sender_id: senderId,
      subject: subject || 'Sem assunto',
      body,
      message_type
    };

    const savedMessage = await saveToSupabase('messages', message, env);

    // Create message recipients
    for (const recipientId of recipients) {
      await saveToSupabase('message_recipients', {
        message_id: savedMessage.id,
        recipient_id: recipientId,
        read: false
      }, env);
    }

    return savedMessage;
  } catch (error) {
    if (error.statusCode) throw error;

    const statusError = new Error('Erro ao enviar mensagem');
    statusError.statusCode = 502;
    throw statusError;
  }
}

export async function getInboxMessages(userId, env = process.env) {
  if (!userId) {
    const error = new Error('ID do usuário é obrigatório');
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

    const query = `
      select m.*, mr.read, mr.archived
      from messages m
      join message_recipients mr on m.id = mr.message_id
      where mr.recipient_id = '${userId}' and mr.archived = false
      order by m.sent_at desc
    `;

    // Use RPC or direct query if available
    // For now, use a simpler approach
    const recipients = await getFromSupabase(
      'message_recipients',
      `recipient_id=eq.${userId}&archived=eq.false&order=created_at.desc`,
      env,
      true
    );

    const messages = [];
    for (const recipient of recipients) {
      const msg = await getFromSupabase('messages', `id=eq.${recipient.message_id}`, env);
      if (msg) {
        messages.push({
          ...msg,
          read: recipient.read,
          archived: recipient.archived
        });
      }
    }

    return messages;
  } catch (error) {
    if (error.statusCode) throw error;

    const statusError = new Error('Erro ao listar mensagens');
    statusError.statusCode = 502;
    throw statusError;
  }
}

export async function markMessageAsRead(messageId, userId, env = process.env) {
  if (!messageId || !userId) {
    const error = new Error('ID da mensagem e usuário são obrigatórios');
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
      `${supabaseUrl}/rest/v1/message_recipients?message_id=eq.${messageId}&recipient_id=eq.${userId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseServiceRoleKey}`,
          apikey: supabaseServiceRoleKey,
          Prefer: 'return=representation'
        },
        body: JSON.stringify({
          read: true,
          read_at: new Date().toISOString()
        })
      }
    );

    const text = await response.text();

    if (!response.ok) {
      const error = new Error(text || 'Erro ao marcar como lida');
      error.statusCode = 502;
      throw error;
    }

    return { success: true };
  } catch (error) {
    if (error.statusCode) throw error;

    const statusError = new Error('Erro ao marcar como lida');
    statusError.statusCode = 502;
    throw statusError;
  }
}

export async function archiveMessage(messageId, userId, env = process.env) {
  if (!messageId || !userId) {
    const error = new Error('ID da mensagem e usuário são obrigatórios');
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
      `${supabaseUrl}/rest/v1/message_recipients?message_id=eq.${messageId}&recipient_id=eq.${userId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseServiceRoleKey}`,
          apikey: supabaseServiceRoleKey,
          Prefer: 'return=representation'
        },
        body: JSON.stringify({
          archived: true
        })
      }
    );

    const text = await response.text();

    if (!response.ok) {
      const error = new Error(text || 'Erro ao arquivar');
      error.statusCode = 502;
      throw error;
    }

    return { success: true };
  } catch (error) {
    if (error.statusCode) throw error;

    const statusError = new Error('Erro ao arquivar mensagem');
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
