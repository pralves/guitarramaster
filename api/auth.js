import { registerStudent, registerAdmin, loginUser, verifyToken, refreshToken } from '../scripts/auth-service.mjs';

export default async function handler(req, res) {
  const { action } = req.query;

  try {
    // REGISTER STUDENT
    if (action === 'register' && req.method === 'POST') {
      const result = await registerStudent(req.body, process.env);
      return res.status(201).json(result);
    }

    // REGISTER ADMIN
    if (action === 'register-admin' && req.method === 'POST') {
      const result = await registerAdmin(req.body, process.env);
      return res.status(201).json(result);
    }

    // LOGIN
    if (action === 'login' && req.method === 'POST') {
      const result = await loginUser(req.body, process.env);
      
      // Set secure cookie with refresh token
      res.setHeader(
        'Set-Cookie',
        `refresh_token=${result.refresh_token}; Path=/; HttpOnly; SameSite=Strict; ${
          process.env.NODE_ENV === 'production' ? 'Secure;' : ''
        }`
      );

      return res.status(200).json({
        access_token: result.access_token,
        user: result.user
      });
    }

    // VERIFY TOKEN
    if (action === 'verify' && req.method === 'GET') {
      const token = extractBearerToken(req);
      const user = await verifyToken(token, process.env);
      return res.status(200).json({ user });
    }

    // REFRESH TOKEN
    if (action === 'refresh' && req.method === 'POST') {
      const refreshTokenFromCookie = extractRefreshToken(req);
      const result = await refreshToken(refreshTokenFromCookie, process.env);
      
      // Update cookie
      res.setHeader(
        'Set-Cookie',
        `refresh_token=${result.refresh_token}; Path=/; HttpOnly; SameSite=Strict; ${
          process.env.NODE_ENV === 'production' ? 'Secure;' : ''
        }`
      );

      return res.status(200).json({
        access_token: result.access_token
      });
    }

    // LOGOUT
    if (action === 'logout' && req.method === 'POST') {
      res.setHeader(
        'Set-Cookie',
        `refresh_token=; Path=/; HttpOnly; Max-Age=0; SameSite=Strict;`
      );
      return res.status(200).json({ success: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    res.status(error.statusCode || 502).json({ 
      error: error.message || 'Erro ao processar autenticação' 
    });
  }
}

function extractBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : '';
}

function extractRefreshToken(req) {
  const cookies = req.headers.cookie || '';
  const match = cookies.match(/refresh_token=([^;]+)/);
  return match ? match[1] : '';
}
