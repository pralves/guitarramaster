# Learning Platform - Guitarra Master

Plataforma de ensino online com áreas de alunos e administração para o Guitarra Master.

## 📋 Sumário

1. [Setup Inicial](#setup-inicial)
2. [Configuração do Banco de Dados](#configuração-do-banco-de-dados)
3. [APIs](#apis)
4. [Autenticação](#autenticação)
5. [Exemplos de Uso](#exemplos-de-uso)

---

## Setup Inicial

### Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env` e preencha com suas credenciais:

```bash
cp .env.example .env
```

Variáveis obrigatórias:

- `SUPABASE_URL` - URL do Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Chave de serviço do Supabase (para operações no backend)
- `SUPABASE_ANON_KEY` - Chave anon do Supabase (para operações autenticadas do cliente)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - Configurações de email (opcional)

---

## Configuração do Banco de Dados

### 1. Criar Tabelas

Execute o SQL em `supabase/learning-platform.sql` no console SQL do Supabase:

```sql
-- Copiar e colar todo o conteúdo de supabase/learning-platform.sql
-- no Supabase SQL Editor
```

Isso criará:
- Tabelas de usuários, módulos, aulas, vídeos, materiais
- Tabelas de acesso (aluno-módulo, turma-módulo)
- Tabelas de comentários e mensagens
- Políticas de Row Level Security (RLS)

### 2. Verificar Tabelas

No Supabase SQL Editor, execute:

```sql
select * from information_schema.tables 
where table_schema = 'public' and table_name like '%student%' or table_name like '%lesson%';
```

---

## APIs

### Base URL
```
https://guitarramaster.com.br/api/
```

### Headers Necessários

Para endpoints autenticados, inclua o header:
```
Authorization: Bearer {access_token}
```

### Autenticação

#### Registrar Aluno
```
POST /api/auth?action=register
Content-Type: application/json

{
  "email": "aluno@example.com",
  "password": "senha_segura",
  "full_name": "João Silva"
}

Resposta:
{
  "id": "uuid",
  "email": "aluno@example.com",
  "full_name": "João Silva"
}
```

#### Registrar Admin
```
POST /api/auth?action=register-admin
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "senha_segura",
  "full_name": "Pedro Admin"
}
```

#### Login
```
POST /api/auth?action=login
Content-Type: application/json

{
  "email": "aluno@example.com",
  "password": "senha_segura"
}

Resposta:
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "aluno@example.com",
    "full_name": "João Silva",
    "user_type": "student"
  }
}
```

#### Verificar Token
```
GET /api/auth?action=verify
Authorization: Bearer {access_token}

Resposta:
{
  "user": { /* dados do usuário */ }
}
```

#### Renovar Token
```
POST /api/auth?action=refresh
Cookie: refresh_token={refresh_token}

Resposta:
{
  "access_token": "novo_token"
}
```

---

### Módulos

#### Criar Módulo (Admin)
```
POST /api/modules
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "title": "Introdução à Guitarra",
  "description": "Aprenda os fundamentos da guitarra",
  "order_index": 1
}

Resposta:
{
  "id": "uuid",
  "title": "Introdução à Guitarra",
  "admin_id": "uuid",
  "active": true,
  "created_at": "2026-01-15T10:30:00Z"
}
```

#### Listar Módulos
```
GET /api/modules
Authorization: Bearer {admin_token}

Resposta:
[
  { /* módulo 1 */ },
  { /* módulo 2 */ }
]
```

#### Atualizar Módulo (Admin)
```
PATCH /api/modules?id={module_id}
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "title": "Novo título",
  "active": true
}
```

#### Deletar Módulo (Admin)
```
DELETE /api/modules?id={module_id}
Authorization: Bearer {admin_token}
```

---

### Aulas

#### Criar Aula (Admin)
```
POST /api/lessons?moduleId={module_id}
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "title": "Acordes Básicos",
  "description": "Aprenda os 3 acordes principais",
  "order_index": 1
}

Resposta:
{
  "id": "uuid",
  "title": "Acordes Básicos",
  "module_id": "uuid",
  "active": true,
  "created_at": "2026-01-15T10:30:00Z"
}
```

#### Listar Aulas de um Módulo
```
GET /api/lessons?moduleId={module_id}
Authorization: Bearer {admin_token}

Resposta:
[
  { /* aula 1 */ },
  { /* aula 2 */ }
]
```

#### Adicionar Vídeo à Aula (Admin)
```
POST /api/lessons?id={lesson_id}&action=videos
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "file_name": "acordes-basicos.mp4",
  "file_size": 524288000,
  "file_path": "/uploads/videos/acordes-basicos.mp4",
  "duration_seconds": 3600
}

Resposta:
{
  "id": "uuid",
  "lesson_id": "uuid",
  "file_name": "acordes-basicos.mp4",
  "file_path": "/uploads/videos/acordes-basicos.mp4"
}
```

#### Adicionar Material (PDF) à Aula (Admin)
```
POST /api/lessons?id={lesson_id}&action=materials
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "title": "Diagrama de Acordes",
  "file_name": "diagrama-acordes.pdf",
  "file_size": 2097152,
  "file_path": "/uploads/materials/diagrama-acordes.pdf",
  "material_type": "pdf"
}

Resposta:
{
  "id": "uuid",
  "lesson_id": "uuid",
  "title": "Diagrama de Acordes",
  "file_path": "/uploads/materials/diagrama-acordes.pdf"
}
```

---

### Alunos

#### Listar Alunos (Admin)
```
GET /api/admin-management?type=student
Authorization: Bearer {admin_token}

Resposta:
[
  {
    "id": "uuid",
    "email": "aluno@example.com",
    "full_name": "João Silva",
    "user_type": "student",
    "active": true
  }
]
```

#### Obter Aluno
```
GET /api/admin-management?type=student&id={student_id}
Authorization: Bearer {token}
```

#### Atualizar Aluno (Admin)
```
PATCH /api/admin-management?type=student&id={student_id}
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "full_name": "João da Silva",
  "active": true
}
```

#### Obter Módulos do Aluno
```
GET /api/admin-management?type=student&id={student_id}&action=modules
Authorization: Bearer {admin_token}

Resposta:
[
  { /* módulo liberado para o aluno */ }
]
```

#### Liberar Módulo para Aluno (Admin)
```
POST /api/admin-management?type=student&id={student_id}&action=modules&moduleId={module_id}
Authorization: Bearer {admin_token}

Resposta:
{
  "id": "uuid",
  "student_id": "uuid",
  "module_id": "uuid",
  "granted_at": "2026-01-15T10:30:00Z"
}
```

#### Revogar Acesso a Módulo (Admin)
```
DELETE /api/admin-management?type=student&id={student_id}&action=modules&moduleId={module_id}
Authorization: Bearer {admin_token}
```

---

### Turmas

#### Criar Turma (Admin)
```
POST /api/admin-management?type=class
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "name": "Turma 2026-01",
  "description": "Turma de janeiro de 2026"
}

Resposta:
{
  "id": "uuid",
  "name": "Turma 2026-01",
  "admin_id": "uuid",
  "active": true
}
```

#### Listar Turmas (Admin)
```
GET /api/admin-management?type=class
Authorization: Bearer {admin_token}
```

#### Listar Membros da Turma (Admin)
```
GET /api/admin-management?type=class&id={class_id}&action=members
Authorization: Bearer {admin_token}

Resposta:
[
  { /* aluno 1 */ },
  { /* aluno 2 */ }
]
```

#### Adicionar Aluno à Turma (Admin)
```
POST /api/admin-management?type=class&id={class_id}&action=members&studentId={student_id}
Authorization: Bearer {admin_token}

Resposta:
{
  "id": "uuid",
  "class_id": "uuid",
  "student_id": "uuid",
  "joined_at": "2026-01-15T10:30:00Z"
}
```

#### Remover Aluno da Turma (Admin)
```
DELETE /api/admin-management?type=class&id={class_id}&action=members&studentId={student_id}
Authorization: Bearer {admin_token}
```

#### Liberar Módulo para Turma (Admin)
```
POST /api/admin-management?type=class&id={class_id}&action=modules&moduleId={module_id}
Authorization: Bearer {admin_token}

Resposta:
{
  "id": "uuid",
  "class_id": "uuid",
  "module_id": "uuid",
  "granted_at": "2026-01-15T10:30:00Z"
}
```

---

### Comentários

#### Enviar Comentário (Aluno)
```
POST /api/comments-messages?type=comment&id={lesson_id}
Authorization: Bearer {student_token}
Content-Type: application/json

{
  "content": "Qual é o próximo passo após esses acordes?",
  "parent_comment_id": null
}

Resposta:
{
  "id": "uuid",
  "lesson_id": "uuid",
  "student_id": "uuid",
  "content": "Qual é o próximo passo...",
  "status": "pending",
  "created_at": "2026-01-15T10:30:00Z"
}
```

#### Listar Comentários Aprovados
```
GET /api/comments-messages?type=comment&id={lesson_id}
Authorization: Bearer {token}

Resposta:
[
  { /* comentário 1 */ },
  { /* comentário 2 */ }
]
```

#### Listar Comentários Pendentes (Admin)
```
GET /api/comments-messages?type=comment&id={lesson_id}&action=pending
Authorization: Bearer {admin_token}

Resposta:
[
  { /* comentário pendente 1 */ }
]
```

#### Aprovar Comentário (Admin)
```
PATCH /api/comments-messages?type=comment&id={comment_id}&action=approve
Authorization: Bearer {admin_token}

Resposta:
{
  "id": "uuid",
  "status": "approved"
}
```

---

### Mensagens

#### Enviar Mensagem
```
POST /api/comments-messages?type=message
Authorization: Bearer {token}
Content-Type: application/json

{
  "subject": "Dúvida sobre a aula",
  "body": "Não entendi bem a técnica de palhetada...",
  "message_type": "direct",
  "recipients": ["uuid-aluno-1", "uuid-aluno-2"]
}

Resposta:
{
  "id": "uuid",
  "sender_id": "uuid",
  "subject": "Dúvida sobre a aula",
  "body": "Não entendi bem...",
  "sent_at": "2026-01-15T10:30:00Z"
}
```

#### Obter Caixa de Entrada
```
GET /api/comments-messages?type=message
Authorization: Bearer {token}

Resposta:
[
  {
    "id": "uuid",
    "sender_id": "uuid",
    "subject": "...",
    "body": "...",
    "read": false,
    "archived": false,
    "sent_at": "2026-01-15T10:30:00Z"
  }
]
```

#### Marcar Mensagem como Lida
```
PATCH /api/comments-messages?type=message&id={message_id}&action=read
Authorization: Bearer {token}

Resposta:
{
  "success": true
}
```

#### Arquivar Mensagem
```
PATCH /api/comments-messages?type=message&id={message_id}&action=archive
Authorization: Bearer {token}

Resposta:
{
  "success": true
}
```

---

## Autenticação

### Fluxo de Login Recomendado

1. **POST** `/api/auth?action=login` com email e senha
2. Backend retorna `access_token` e dados do usuário
3. Cliente armazena `access_token` em memória (ou localStorage com cuidado)
4. Incluir `Authorization: Bearer {access_token}` em todas as requisições autenticadas
5. Quando token expirar, chamar `POST /api/auth?action=refresh`

### Refresh Token
O `refresh_token` é armazenado em cookie HTTP-only pelo servidor. O cliente não precisa gerenciar manualmente.

---

## Exemplos de Uso

### Exemplo JavaScript (Cliente)

```javascript
// 1. Login
const loginResponse = await fetch('/api/auth?action=login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'aluno@example.com',
    password: 'senha'
  })
});

const { access_token, user } = await loginResponse.json();

// 2. Fazer requisição autenticada
const modulesResponse = await fetch('/api/modules', {
  headers: {
    'Authorization': `Bearer ${access_token}`
  }
});

const modules = await modulesResponse.json();

// 3. Enviar comentário
const commentResponse = await fetch(
  `/api/comments-messages?type=comment&id=${lessonId}`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      content: 'Ótima aula!'
    })
  }
);

const comment = await commentResponse.json();
console.log('Comentário enviado:', comment);
```

### Exemplo cURL (Admin criando módulo)

```bash
curl -X POST \
  'https://guitarramaster.com.br/api/modules' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiI...' \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Técnicas Avançadas",
    "description": "Módulo de técnicas avançadas",
    "order_index": 2
  }'
```

---

## Segurança

- Senhas são hasheadas automaticamente pelo Supabase Auth
- Tokens JWT expiram em 1 hora (configurável no Supabase)
- Row Level Security (RLS) enforce permissões no banco de dados
- Alunos só veem módulos liberados para eles
- Admins veem tudo
- Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` no cliente

---

## Próximos Passos

1. ✅ Criar schemas do Supabase
2. ✅ Implementar autenticação
3. ✅ Criar APIs para módulos, aulas, alunos, turmas
4. ✅ Implementar comentários e mensagens
5. ⏳ Criar frontend (páginas HTML/JS)
6. ⏳ Implementar upload de vídeos/PDFs
7. ⏳ Testes completos
