import { verifyToken } from '../scripts/auth-service.mjs';
import {
  createLessonComment,
  getLessonComments,
  getCommentsPendingModeration,
  approveComment,
  hideComment,
  deleteComment,
  sendMessage,
  getInboxMessages,
  markMessageAsRead,
  archiveMessage
} from '../scripts/comments-messages-service.mjs';

export default async function handler(req, res) {
  const { type, id, action } = req.query;

  try {
    const token = extractBearerToken(req);
    const user = await verifyToken(token, process.env);

    // LESSON COMMENTS
    if (type === 'comment') {
      // Create comment (students only)
      if (req.method === 'POST' && id && !action) {
        if (user.user_type !== 'student') {
          return res.status(403).json({ error: 'Apenas alunos podem comentar' });
        }

        const comment = await createLessonComment(id, user.id, req.body, process.env);
        return res.status(201).json(comment);
      }

      // Get approved comments
      if (req.method === 'GET' && id && !action) {
        const comments = await getLessonComments(id, process.env);
        return res.status(200).json(comments);
      }

      // Get pending comments (admin only)
      if (req.method === 'GET' && id && action === 'pending') {
        if (user.user_type !== 'admin') {
          return res.status(403).json({ error: 'Acesso negado' });
        }

        const comments = await getCommentsPendingModeration(id, process.env);
        return res.status(200).json(comments);
      }

      // Approve comment (admin only)
      if (req.method === 'PATCH' && id && action === 'approve') {
        if (user.user_type !== 'admin') {
          return res.status(403).json({ error: 'Acesso negado' });
        }

        const result = await approveComment(id, process.env);
        return res.status(200).json(result);
      }

      // Hide comment (admin only)
      if (req.method === 'PATCH' && id && action === 'hide') {
        if (user.user_type !== 'admin') {
          return res.status(403).json({ error: 'Acesso negado' });
        }

        const result = await hideComment(id, process.env);
        return res.status(200).json(result);
      }

      // Delete comment (admin only)
      if (req.method === 'DELETE' && id && !action) {
        if (user.user_type !== 'admin') {
          return res.status(403).json({ error: 'Acesso negado' });
        }

        await deleteComment(id, process.env);
        return res.status(204).send('');
      }
    }

    // MESSAGES
    if (type === 'message') {
      // Send message
      if (req.method === 'POST' && !id && !action) {
        const message = await sendMessage(req.body, user.id, process.env);
        return res.status(201).json(message);
      }

      // Get inbox
      if (req.method === 'GET' && !id && !action) {
        const messages = await getInboxMessages(user.id, process.env);
        return res.status(200).json(messages);
      }

      // Mark as read
      if (req.method === 'PATCH' && id && action === 'read') {
        const result = await markMessageAsRead(id, user.id, process.env);
        return res.status(200).json(result);
      }

      // Archive message
      if (req.method === 'PATCH' && id && action === 'archive') {
        const result = await archiveMessage(id, user.id, process.env);
        return res.status(200).json(result);
      }
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    if (error.message === 'Token inválido ou expirado' || error.statusCode === 401) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    res.status(error.statusCode || 502).json({
      error: error.message || 'Erro ao processar requisição'
    });
  }
}

function extractBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : '';
}
