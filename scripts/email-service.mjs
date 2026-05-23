import tls from 'node:tls';

const DEFAULT_SMTP_HOST = 'smtp.hostinger.com';
const DEFAULT_SMTP_PORT = 465;
const DEFAULT_SMTP_USER = 'contato@guitarramaster.com.br';
const DEFAULT_FROM_NAME = 'Guitarra Master';

export async function sendLeadConfirmationEmail(lead, env = process.env) {
  const smtpConfig = getSmtpConfig(env);
  if (!smtpConfig) return false;

  const subject = 'Inscricao confirmada - Guitarra Master';
  const html = buildLeadConfirmationHtml(lead);
  const text = buildLeadConfirmationText(lead);

  await sendSmtpMail({
    ...smtpConfig,
    to: lead.email,
    subject,
    html,
    text
  });

  return true;
}

function getSmtpConfig(env) {
  const host = String(env.SMTP_HOST || DEFAULT_SMTP_HOST);
  const port = Number(env.SMTP_PORT || DEFAULT_SMTP_PORT);
  const user = String(env.SMTP_USER || DEFAULT_SMTP_USER);
  const pass = String(env.SMTP_PASS || env.SMTP_PASSWORD || '');
  const fromEmail = String(env.SMTP_FROM_EMAIL || user);
  const fromName = String(env.SMTP_FROM_NAME || DEFAULT_FROM_NAME);

  if (!host || !port || !user || !pass || !fromEmail) return null;

  return { host, port, user, pass, fromEmail, fromName };
}

async function sendSmtpMail({ host, port, user, pass, fromEmail, fromName, to, subject, html, text }) {
  const socket = tls.connect({ host, port, servername: host });
  socket.setEncoding('utf8');

  let buffer = '';
  const pendingResponses = [];
  const responseWaiters = [];

  const flushResponse = response => {
    const waiter = responseWaiters.shift();
    if (waiter) {
      waiter.resolve(response);
      return;
    }

    pendingResponses.push(response);
  };

  socket.on('data', chunk => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/).filter(Boolean);
    const lastLine = lines[lines.length - 1] || '';

    if (/^\d{3}\s/.test(lastLine)) {
      const response = buffer;
      buffer = '';
      flushResponse(response);
    }
  });

  socket.on('error', error => {
    while (responseWaiters.length) {
      responseWaiters.shift().reject(error);
    }
  });

  const readResponse = () => {
    const response = pendingResponses.shift();
    if (response) return Promise.resolve(response);

    return new Promise((resolve, reject) => {
      responseWaiters.push({ resolve, reject });
    });
  };

  const command = async (line, expectedCodes) => {
    socket.write(`${line}\r\n`);
    const response = await readResponse();
    const code = response.slice(0, 3);

    if (!expectedCodes.includes(code)) {
      throw new Error(`SMTP ${line.split(' ')[0]} falhou: ${response.trim()}`);
    }

    return response;
  };

  await new Promise((resolve, reject) => {
    socket.once('secureConnect', resolve);
    socket.once('error', reject);
  });

  try {
    await expectInitialResponse(readResponse());
    await command(`EHLO ${host}`, ['250']);
    await command('AUTH LOGIN', ['334']);
    await command(Buffer.from(user).toString('base64'), ['334']);
    await command(Buffer.from(pass).toString('base64'), ['235']);
    await command(`MAIL FROM:<${fromEmail}>`, ['250']);
    await command(`RCPT TO:<${to}>`, ['250', '251']);
    await command('DATA', ['354']);
    socket.write(`${buildMimeMessage({ fromEmail, fromName, to, subject, html, text })}\r\n.\r\n`);
    const dataResponse = await readResponse();
    if (!dataResponse.startsWith('250')) {
      throw new Error(`SMTP DATA falhou: ${dataResponse.trim()}`);
    }
    await command('QUIT', ['221']);
  } finally {
    socket.end();
  }
}

async function expectInitialResponse(responsePromise) {
  const response = await responsePromise;
  if (!response.startsWith('220')) {
    throw new Error(`SMTP conexao falhou: ${response.trim()}`);
  }
}

function buildMimeMessage({ fromEmail, fromName, to, subject, html, text }) {
  const boundary = `gm-${Date.now().toString(36)}`;

  return [
    `From: ${encodeHeader(fromName)} <${fromEmail}>`,
    `To: <${to}>`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    dotStuff(text),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    dotStuff(html),
    '',
    `--${boundary}--`
  ].join('\r\n');
}

function buildLeadConfirmationText(lead) {
  return [
    `Olá, ${lead.name}!`,
    '',
    'Sua inscrição no Guitarra Master foi confirmada com sucesso.',
    'Obrigado pela confiança no trabalho do Alexandre Valladão e da equipe Guitarra Master.',
    '',
    'Em breve você receberá novas informações sobre os próximos passos.',
    '',
    'Guitarra Master'
  ].join('\n');
}

function buildLeadConfirmationHtml(lead) {
  const firstName = escapeHtml(lead.name).split(/\s+/)[0] || 'aluno';

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Inscrição confirmada</title>
  </head>
  <body style="margin:0;background:#071120;color:#f8fafc;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#071120;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#0d233b;border:1px solid rgba(255,255,255,0.12);border-radius:18px;overflow:hidden;">
            <tr>
              <td style="background:#f97316;padding:14px 24px;color:#111827;font-size:12px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;">Guitarra Master</td>
            </tr>
            <tr>
              <td style="padding:34px 28px 12px;">
                <h1 style="margin:0;color:#ffffff;font-size:34px;line-height:1.02;text-transform:uppercase;font-weight:800;">Inscrição confirmada</h1>
                <p style="margin:18px 0 0;color:#cbd5e1;font-size:16px;line-height:1.65;">Olá, ${firstName}. Seu cadastro foi recebido com sucesso.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 28px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0f2f4f;border:1px solid rgba(255,255,255,0.1);border-radius:14px;">
                  <tr>
                    <td style="padding:22px;">
                      <p style="margin:0;color:#f8fafc;font-size:17px;line-height:1.65;">Obrigado pela confiança no trabalho do Alexandre Valladão e da equipe Guitarra Master.</p>
                      <p style="margin:16px 0 0;color:#cbd5e1;font-size:15px;line-height:1.65;">Em breve você receberá novas informações sobre os próximos passos e conteúdos do curso.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 34px;">
                <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.6;">Este e-mail confirma sua inscrição realizada em guitarramaster.com.br.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function encodeHeader(value) {
  return `=?UTF-8?B?${Buffer.from(String(value), 'utf8').toString('base64')}?=`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function dotStuff(value) {
  return String(value).replace(/^\./gm, '..');
}
