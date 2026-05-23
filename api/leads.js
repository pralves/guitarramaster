import { buildLeadFromPayload, saveLeadAndSendConfirmation } from '../scripts/leads-service.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const lead = buildLeadFromPayload(payload || {});
    res.status(201).json(await saveLeadAndSendConfirmation(lead));
  } catch (error) {
    res.status(error.statusCode || 502).json({ error: error.message || 'Erro ao gravar cadastro' });
  }
}
