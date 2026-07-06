import { verifyToken } from '../scripts/auth-service.mjs';
import {
  getStudent,
  getStudents,
  updateStudent,
  getStudentModules,
  grantModuleToStudent,
  revokeModuleFromStudent,
  createClass,
  updateClass,
  getClass,
  getClasses,
  deleteClass,
  addStudentToClass,
  removeStudentFromClass,
  getClassMembers,
  grantModuleToClass,
  revokeModuleFromClass
} from '../scripts/student-class-service.mjs';
import { listEnrollmentCandidates, enrollLeadInModule } from '../scripts/enrollment-service.mjs';

export default async function handler(req, res) {
  const { action, type, id, classId, moduleId, studentId } = req.query;

  try {
    const token = extractBearerToken(req);
    const user = await verifyToken(token, process.env);

    // ENROLLMENT ENDPOINTS
    if (type === 'enrollment') {
      if (user.user_type !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      if (req.method === 'GET') {
        return res.status(200).json(await listEnrollmentCandidates(process.env));
      }

      if (req.method === 'POST') {
        const result = await enrollLeadInModule(req.body?.leadId, req.body?.moduleId, process.env);
        return res.status(201).json(result);
      }
    }

    // STUDENT ENDPOINTS
    if (type === 'student') {
      // Get student profile (students can view own, admins view all)
      if (req.method === 'GET' && id && !action) {
        if (user.user_type === 'student' && user.id !== id) {
          return res.status(403).json({ error: 'Acesso negado' });
        }

        const student = await getStudent(id, process.env);
        if (!student) {
          return res.status(404).json({ error: 'Aluno não encontrado' });
        }

        return res.status(200).json(student);
      }

      // List students (admin only)
      if (req.method === 'GET' && !id && !action) {
        if (user.user_type !== 'admin') {
          return res.status(403).json({ error: 'Acesso negado' });
        }

        const students = await getStudents({}, process.env);
        return res.status(200).json(students);
      }

      // Update student (admin only)
      if (req.method === 'PATCH' && id && !action) {
        if (user.user_type !== 'admin') {
          return res.status(403).json({ error: 'Acesso negado' });
        }

        const student = await updateStudent(id, req.body, process.env);
        return res.status(200).json(student);
      }

      // Get student modules
      if (req.method === 'GET' && id && action === 'modules') {
        if (user.user_type === 'student' && user.id !== id) {
          return res.status(403).json({ error: 'Acesso negado' });
        }

        const modules = await getStudentModules(id, process.env);
        return res.status(200).json(modules);
      }

      // Grant module to student (admin only)
      if (req.method === 'POST' && id && action === 'modules' && moduleId) {
        if (user.user_type !== 'admin') {
          return res.status(403).json({ error: 'Acesso negado' });
        }

        const result = await grantModuleToStudent(id, moduleId, process.env);
        return res.status(201).json(result);
      }

      // Revoke module from student (admin only)
      if (req.method === 'DELETE' && id && action === 'modules' && moduleId) {
        if (user.user_type !== 'admin') {
          return res.status(403).json({ error: 'Acesso negado' });
        }

        const result = await revokeModuleFromStudent(id, moduleId, process.env);
        return res.status(200).json(result);
      }
    }

    // CLASS ENDPOINTS
    if (type === 'class') {
      // Create class (admin only)
      if (req.method === 'POST' && !id && !action) {
        if (user.user_type !== 'admin') {
          return res.status(403).json({ error: 'Acesso negado' });
        }

        const classGroup = await createClass(req.body, user.id, process.env);
        return res.status(201).json(classGroup);
      }

      // List classes (admin only)
      if (req.method === 'GET' && !id && !action) {
        if (user.user_type !== 'admin') {
          return res.status(403).json({ error: 'Acesso negado' });
        }

        const classes = await getClasses(user.id, process.env);
        return res.status(200).json(classes);
      }

      // Get class (admin only)
      if (req.method === 'GET' && id && !action) {
        if (user.user_type !== 'admin') {
          return res.status(403).json({ error: 'Acesso negado' });
        }

        const classGroup = await getClass(id, process.env);
        if (!classGroup) {
          return res.status(404).json({ error: 'Turma não encontrada' });
        }

        return res.status(200).json(classGroup);
      }

      // Update class (admin only)
      if (req.method === 'PATCH' && id && !action) {
        if (user.user_type !== 'admin') {
          return res.status(403).json({ error: 'Acesso negado' });
        }

        const classGroup = await updateClass(id, req.body, process.env);
        return res.status(200).json(classGroup);
      }

      // Delete class (admin only)
      if (req.method === 'DELETE' && id && !action) {
        if (user.user_type !== 'admin') {
          return res.status(403).json({ error: 'Acesso negado' });
        }

        await deleteClass(id, process.env);
        return res.status(204).send('');
      }

      // Get class members
      if (req.method === 'GET' && id && action === 'members') {
        if (user.user_type !== 'admin') {
          return res.status(403).json({ error: 'Acesso negado' });
        }

        const members = await getClassMembers(id, process.env);
        return res.status(200).json(members);
      }

      // Add student to class
      if (req.method === 'POST' && id && action === 'members' && studentId) {
        if (user.user_type !== 'admin') {
          return res.status(403).json({ error: 'Acesso negado' });
        }

        const result = await addStudentToClass(id, studentId, process.env);
        return res.status(201).json(result);
      }

      // Remove student from class
      if (req.method === 'DELETE' && id && action === 'members' && studentId) {
        if (user.user_type !== 'admin') {
          return res.status(403).json({ error: 'Acesso negado' });
        }

        const result = await removeStudentFromClass(id, studentId, process.env);
        return res.status(200).json(result);
      }

      // Get class modules
      if (req.method === 'GET' && id && action === 'modules') {
        if (user.user_type !== 'admin') {
          return res.status(403).json({ error: 'Acesso negado' });
        }

        // This would need a getClassModules function
        return res.status(200).json([]);
      }

      // Grant module to class
      if (req.method === 'POST' && id && action === 'modules' && moduleId) {
        if (user.user_type !== 'admin') {
          return res.status(403).json({ error: 'Acesso negado' });
        }

        const result = await grantModuleToClass(id, moduleId, process.env);
        return res.status(201).json(result);
      }

      // Revoke module from class
      if (req.method === 'DELETE' && id && action === 'modules' && moduleId) {
        if (user.user_type !== 'admin') {
          return res.status(403).json({ error: 'Acesso negado' });
        }

        const result = await revokeModuleFromClass(id, moduleId, process.env);
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
