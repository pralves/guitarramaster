import { verifyToken } from '../scripts/auth-service.mjs';
import {
  createModule,
  updateModule,
  getModule,
  getModules,
  deleteModule
} from '../scripts/module-service.mjs';

export default async function handler(req, res) {
  const { id } = req.query;

  try {
    const token = extractBearerToken(req);
    const user = await verifyToken(token, process.env);

    // Only admins can manage modules
    if (user.user_type !== 'admin') {
      res.status(403).json({ error: 'Acesso negado' });
      return;
    }

    // CREATE
    if (req.method === 'POST' && !id) {
      const result = await createModule(req.body, user.id, process.env);
      return res.status(201).json(result);
    }

    // READ
    if (req.method === 'GET' && !id) {
      const filters = {
        admin_id: user.id,
        active: req.query.active !== undefined ? req.query.active === 'true' : undefined
      };
      const results = await getModules(filters, process.env);
      return res.status(200).json(results);
    }

    // READ ONE
    if (req.method === 'GET' && id) {
      const result = await getModule(id, process.env);
      if (!result) {
        return res.status(404).json({ error: 'Módulo não encontrado' });
      }
      return res.status(200).json(result);
    }

    // UPDATE
    if (req.method === 'PATCH' && id) {
      const result = await updateModule(id, req.body, process.env);
      return res.status(200).json(result);
    }

    // DELETE
    if (req.method === 'DELETE' && id) {
      await deleteModule(id, process.env);
      return res.status(204).send('');
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    if (error.message === 'Token inválido ou expirado' || error.statusCode === 401) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    res.status(error.statusCode || 502).json({
      error: error.message || 'Erro ao processar módulos'
    });
  }
}

function extractBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : '';
}
