import { verifyToken } from '../scripts/auth-service.mjs';
import {
  createLesson,
  updateLesson,
  getLesson,
  getLessonsByModule,
  deleteLesson,
  addLessonVideo,
  getLessonVideos,
  addLessonMaterial,
  getLessonMaterials,
  createExercise,
  updateExercise,
  getLessonExercises,
  deleteExercise
} from '../scripts/lesson-service.mjs';

export default async function handler(req, res) {
  const { id, moduleId, action } = req.query;

  try {
    const token = extractBearerToken(req);
    const user = await verifyToken(token, process.env);

    // LESSON VIDEOS ENDPOINTS
    if (action === 'videos') {
      if (req.method === 'GET' && id) {
        const videos = await getLessonVideos(id, process.env);
        return res.status(200).json(videos);
      }

      if (req.method === 'POST' && id) {
        if (user.user_type !== 'admin') {
          return res.status(403).json({ error: 'Acesso negado' });
        }

        const video = await addLessonVideo(id, req.body, process.env);
        return res.status(201).json(video);
      }
    }

    // LESSON MATERIALS ENDPOINTS
    if (action === 'materials') {
      if (req.method === 'GET' && id) {
        const materials = await getLessonMaterials(id, process.env);
        return res.status(200).json(materials);
      }

      if (req.method === 'POST' && id) {
        if (user.user_type !== 'admin') {
          return res.status(403).json({ error: 'Acesso negado' });
        }

        const material = await addLessonMaterial(id, req.body, process.env);
        return res.status(201).json(material);
      }
    }

    // LESSON EXERCISES ENDPOINTS
    if (action === 'exercises') {
      if (req.method === 'GET' && id) {
        const exercises = await getLessonExercises(id, process.env);
        return res.status(200).json(exercises);
      }

      if (req.method === 'POST' && id) {
        if (user.user_type !== 'admin') {
          return res.status(403).json({ error: 'Acesso negado' });
        }

        const exercise = await createExercise(id, req.body, process.env);
        return res.status(201).json(exercise);
      }
    }

    if (action === 'exercise') {
      if (user.user_type !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      if (req.method === 'PATCH' && id) {
        const exercise = await updateExercise(id, req.body, process.env);
        return res.status(200).json(exercise);
      }

      if (req.method === 'DELETE' && id) {
        await deleteExercise(id, process.env);
        return res.status(204).send('');
      }
    }

    // LESSON CRUD - Only admins can manage
    if (user.user_type !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // CREATE
    if (req.method === 'POST' && !id && moduleId) {
      const result = await createLesson(req.body, moduleId, user.id, process.env);
      return res.status(201).json(result);
    }

    // READ - Get lessons by module
    if (req.method === 'GET' && !id && moduleId) {
      const results = await getLessonsByModule(moduleId, process.env);
      return res.status(200).json(results);
    }

    // READ ONE
    if (req.method === 'GET' && id) {
      const result = await getLesson(id, process.env);
      if (!result) {
        return res.status(404).json({ error: 'Aula não encontrada' });
      }
      return res.status(200).json(result);
    }

    // UPDATE
    if (req.method === 'PATCH' && id) {
      const result = await updateLesson(id, req.body, process.env);
      return res.status(200).json(result);
    }

    // DELETE
    if (req.method === 'DELETE' && id) {
      await deleteLesson(id, process.env);
      return res.status(204).send('');
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    if (error.message === 'Token inválido ou expirado' || error.statusCode === 401) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    res.status(error.statusCode || 502).json({
      error: error.message || 'Erro ao processar aulas'
    });
  }
}

function extractBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : '';
}
