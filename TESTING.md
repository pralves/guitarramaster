# 🧪 Guia de Testes - Guitarra Master

## Preparação

### 1. Executar SQL no Supabase

Acesse seu painel Supabase → SQL Editor → Cole todo o conteúdo de `supabase/learning-platform.sql`

**Verificar se funcionou:**
```sql
-- Execute para confirmar que as tabelas foram criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Deve listar: class_groups, class_module_access, exercises, lesson_comments, 
-- lesson_materials, lesson_videos, lessons, message_recipients, messages, 
-- modules, student_class_membership, student_module_access, user_profiles
```

### 2. Configurar .env

```bash
cp .env.example .env
```

Edite `.env` com suas credenciais:
```
SUPABASE_URL=https://seu-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...  (service role key)
SUPABASE_ANON_KEY=eyJ...  (anon key)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=seu@email.com
SMTP_PASS=sua_senha
```

### 3. Criar Admin Manualmente

No SQL Editor do Supabase:

```sql
-- 1. Criar user na tabela de autenticação
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  'admin@test.com',
  crypt('Admin123!', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  NOW(),
  NOW()
);

-- 2. Obter o ID do usuário criado
SELECT id FROM auth.users WHERE email = 'admin@test.com';

-- 3. Criar o profile (substitua {user_id} pelo resultado anterior)
INSERT INTO public.user_profiles (id, email, full_name, user_type, active)
VALUES (
  '{user_id}',
  'admin@test.com',
  'Admin Teste',
  'admin',
  true
);
```

---

## 🧪 Fluxo de Teste - Admin

### Teste 1: Login Admin

1. Acesse http://localhost:4173/admin-login.html
2. Email: `admin@test.com`
3. Senha: `Admin123!`
4. ✅ Deve redirecionar para dashboard admin

**API testada:** `POST /api/auth?action=login`

---

### Teste 2: Criar Módulo

1. No dashboard admin, clique em "Módulos"
2. Clique em "+ Novo Módulo"
3. Título: "Técnicas Básicas"
4. Descrição: "Aprenda as técnicas básicas de guitarra"
5. Clique "Criar"
6. ✅ Módulo deve aparecer na lista

**API testada:** `POST /api/modules`

```bash
curl -X POST http://localhost:4173/api/modules \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Técnicas Básicas",
    "description": "Aprenda as técnicas básicas"
  }'
```

---

### Teste 3: Criar Aula

1. Dashboard → Modules (se não estiver)
2. Clique em um módulo (ou use API)

**Via API:**
```bash
# Primeiro, obtenha um module_id
curl http://localhost:4173/api/modules \
  -H "Authorization: Bearer {token}"

# Depois crie a aula
curl -X POST "http://localhost:4173/api/lessons?moduleId={module_id}" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Acordes Básicos",
    "description": "Aprenda os 3 acordes principais",
    "order_index": 1
  }'
```

---

### Teste 4: Adicionar Vídeo à Aula

```bash
curl -X POST "http://localhost:4173/api/lessons?id={lesson_id}&action=videos" \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "file_name": "acordes-basicos.mp4",
    "file_size": 524288000,
    "file_path": "/uploads/videos/acordes-basicos.mp4",
    "duration_seconds": 1800
  }'
```

---

### Teste 5: Adicionar Material (PDF)

```bash
curl -X POST "http://localhost:4173/api/lessons?id={lesson_id}&action=materials" \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Diagrama de Acordes",
    "file_name": "diagrama.pdf",
    "file_size": 2097152,
    "file_path": "/uploads/materials/diagrama.pdf",
    "material_type": "pdf"
  }'
```

---

### Teste 6: Criar Turma

```bash
curl -X POST "http://localhost:4173/api/admin-management?type=class" \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Turma Janeiro 2026",
    "description": "Turma de alunos de janeiro"
  }'
```

---

### Teste 7: Criar Aluno

```bash
curl -X POST "http://localhost:4173/api/auth?action=register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "aluno@test.com",
    "password": "Aluno123!",
    "full_name": "João Aluno"
  }'
```

---

### Teste 8: Adicionar Aluno à Turma

```bash
# Primeiro obtenha o class_id e student_id
curl "http://localhost:4173/api/admin-management?type=class" \
  -H "Authorization: Bearer {admin_token}"

# Depois adicione o aluno
curl -X POST "http://localhost:4173/api/admin-management?type=class&id={class_id}&action=members&studentId={student_id}" \
  -H "Authorization: Bearer {admin_token}"
```

---

### Teste 9: Liberar Módulo para Aluno

```bash
curl -X POST "http://localhost:4173/api/admin-management?type=student&id={student_id}&action=modules&moduleId={module_id}" \
  -H "Authorization: Bearer {admin_token}"
```

---

## 🧪 Fluxo de Teste - Aluno

### Teste 10: Login Aluno

1. Acesse http://localhost:4173/login.html
2. Email: `aluno@test.com`
3. Senha: `Aluno123!`
4. ✅ Deve redirecionar para student-dashboard.html

**API testada:** `POST /api/auth?action=login`

---

### Teste 11: Ver Módulos Liberados

1. No student dashboard, aba "Meus Módulos"
2. ✅ Deve listar apenas módulos que foram liberados

**API testada:** `GET /api/admin-management?type=student&id={student_id}&action=modules`

---

### Teste 12: Ver Aulas de um Módulo

1. Clique em um módulo
2. ✅ Deve listar todas as aulas do módulo

**API testada:** `GET /api/lessons?moduleId={module_id}`

---

### Teste 13: Assistir Vídeo e Baixar Material

1. Clique em uma aula
2. ✅ Modal deve abrir com:
   - Vídeo (player)
   - Link para baixar material
3. ✅ Clique no link para baixar PDF

**API testada:** 
- `GET /api/lessons?id={lesson_id}&action=videos`
- `GET /api/lessons?id={lesson_id}&action=materials`

---

### Teste 14: Enviar Comentário

1. Na modal da aula, seção "Comentários e Perguntas"
2. Digite uma pergunta: "Qual é o próximo acorde?"
3. Clique "Enviar"
4. ✅ Comentário deve aparecer (status pending)

**API testada:** `POST /api/comments-messages?type=comment&id={lesson_id}`

---

### Teste 15: Ver Comentários Aprovados

1. Na seção de comentários, deve listar comentários com status "approved"
2. ✅ Aluno não vê comentários "pending"

**API testada:** `GET /api/comments-messages?type=comment&id={lesson_id}`

---

### Teste 16: Enviar e Ver Mensagens

1. Aba "Mensagens"
2. ✅ Deve mostrar todas as mensagens recebidas
3. Clique "Marcar como lido"
4. ✅ Status deve mudar

**API testada:**
- `GET /api/comments-messages?type=message`
- `PATCH /api/comments-messages?type=message&id={msg_id}&action=read`

---

## 🧪 Testes de Autorização

### Teste 17: Aluno NÃO pode ver módulos não liberados

1. Como aluno, tente acessar um módulo que não foi liberado
2. ✅ NÃO deve aparecer na lista (RLS protege)

---

### Teste 18: Aluno NÃO pode criar módulo

```bash
# Tente como aluno (status 403)
curl -X POST "http://localhost:4173/api/modules" \
  -H "Authorization: Bearer {aluno_token}" \
  -H "Content-Type: application/json" \
  -d '{"title": "Hacked"}'

# Resposta: 403 Acesso negado
```

---

### Teste 19: Admin pode gerenciar tudo

1. Como admin, tente criar módulo, aula, etc
2. ✅ Tudo deve funcionar

---

### Teste 20: Token Inválido

```bash
curl http://localhost:4173/api/modules \
  -H "Authorization: Bearer token_invalido"

# Resposta: 401 Não autenticado
```

---

## 📋 Checklist de Testes

### Autenticação
- [ ] Admin pode fazer login
- [ ] Aluno pode fazer login
- [ ] Token inválido retorna 401
- [ ] Login errado retorna 401

### Módulos
- [ ] Admin cria módulo
- [ ] Admin edita módulo
- [ ] Admin deleta módulo
- [ ] Aluno vê apenas módulos liberados
- [ ] Aluno NÃO pode criar módulo

### Aulas
- [ ] Admin cria aula em módulo
- [ ] Admin edita aula
- [ ] Admin deleta aula
- [ ] Aluno vê aulas do módulo liberado
- [ ] Aluno NÃO vê aulas de módulo não liberado

### Materiais
- [ ] Admin adiciona vídeo
- [ ] Admin adiciona PDF
- [ ] Aluno vê vídeo e pode assistir
- [ ] Aluno vê PDF e pode baixar
- [ ] Aluno NÃO pode acessar arquivo diretamente sem RLS

### Alunos & Turmas
- [ ] Admin cria turma
- [ ] Admin adiciona aluno à turma
- [ ] Admin libera módulo para aluno
- [ ] Admin libera módulo para turma inteira
- [ ] Aluno que está em turma vê módulos liberados para turma

### Comentários
- [ ] Aluno envia comentário
- [ ] Comentário começa com status "pending"
- [ ] Admin aprova comentário
- [ ] Aluno vê comentário aprovado
- [ ] Aluno NÃO vê comentário pending

### Mensagens
- [ ] Admin envia mensagem para aluno
- [ ] Aluno recebe mensagem
- [ ] Aluno marca como lido
- [ ] Aluno arquiva mensagem
- [ ] Aluno NÃO vê mensagem arquivada

---

## 🐛 Debug

### Ver logs no console do browser
F12 → Console

### Ver requisições de rede
F12 → Network → Filtrar por "XHR"

### Testar API com cURL
Instale Git Bash ou use PowerShell

### Verificar token JWT
https://jwt.io → Cole token → Veja payload

### Verificar banco Supabase
Supabase Dashboard → SQL Editor → `SELECT * FROM user_profiles;`

---

## ✅ Sucesso!

Se todos os testes passarem, a implementação está funcionando corretamente.

**Status esperado:** 🎉 Plataforma básica funcional!

Próximas fases:
- [ ] Upload de arquivos real
- [ ] Página de registro
- [ ] Melhorias no frontend
- [ ] Testes automatizados
