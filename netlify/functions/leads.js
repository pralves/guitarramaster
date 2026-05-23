import { buildLeadFromPayload, saveLeadAndSendConfirmation } from '../../scripts/leads-service.mjs';

const jsonHeaders = {
  'Content-Type': 'application/json; charset=utf-8'
};

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const lead = buildLeadFromPayload(payload);
    return jsonResponse(201, await saveLeadAndSendConfirmation(lead));
  } catch (error) {
    return jsonResponse(error.statusCode || 502, { error: error.message || 'Erro ao gravar cadastro' });
  }
}

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: jsonHeaders,
    body: JSON.stringify(payload)
  };
}
