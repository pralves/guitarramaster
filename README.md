# Guitarra Master

Projeto estatico publicavel da landing page do Guitarra Master.

## Comandos

```powershell
npm.cmd run dev
npm.cmd run build
npm.cmd run preview
```

No PowerShell do Windows, use `npm.cmd` caso `npm` seja bloqueado pela politica de execucao.

## Deploy

O build gera a pasta `dist`, pronta para publicar em hospedagens estaticas.

- Netlify: `netlify.toml` ja aponta `npm run build` e publica `dist`.
- Vercel: `vercel.json` ja aponta `npm run build` e publica `dist`.
- Qualquer host estatico: rode `npm.cmd run build` e publique o conteudo de `dist`.

Em Vercel e Netlify, o endpoint `POST /api/leads` grava os cadastros no Supabase usando as variaveis `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_LEADS_TABLE`.

## Docker Manager

Arquivos base:

- `Dockerfile`: cria a imagem Node e gera o `dist` no build.
- `docker-compose.yml`: stack para Docker Manager/Portainer.
- `.dockerignore`: reduz o contexto enviado para o Docker.

Para publicar localmente com Docker ativo:

```powershell
docker compose up -d --build
```

A aplicacao sobe em `http://localhost:4174`. Em producao, os cadastros sao enviados para o Supabase por `POST /api/leads`.

Crie um arquivo `.env` no servidor a partir de `.env.example` e preencha a `SUPABASE_SERVICE_ROLE_KEY`. O segredo nao deve ser colocado no `docker-compose.yml`.

Para enviar o e-mail automatico de confirmacao, configure tambem as variaveis SMTP:

```text
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=contato@guitarramaster.com.br
SMTP_PASS=sua_senha_smtp
SMTP_FROM_EMAIL=contato@guitarramaster.com.br
SMTP_FROM_NAME=Guitarra Master
```

## Estrutura

- `index.html`: pagina principal em UTF-8.
- `assets/`: CSS, imagens e bibliotecas locais.
- `js/landing.js`: modal de captura e rolagem suave.
- `scripts/build.mjs`: copia os arquivos publicaveis para `dist`.
- `scripts/preview.mjs`: servidor local simples para conferir o build.
- `db.json`: base local onde o preview grava os cadastros enviados para `/api/leads`.

## Cadastro

Os botoes "Garantir minha vaga" e "Quero ser um Guitarra Master" abrem o formulario de interessados. O formulario envia nome, telefone, e-mail, estado, instrumento de preferencia e origem do clique.

Antes do deploy, crie a tabela no Supabase usando `supabase/minicurso_inscricoes.sql`.

Antes de inserir um novo cadastro, o backend verifica no Supabase se o e-mail ou telefone ja existe. Se existir, retorna erro `409` com a mensagem `E-mail ou telefone ja cadastrado`.

Quando o cadastro e gravado com sucesso no Supabase, o backend envia um e-mail HTML de confirmacao para o aluno. Se o SMTP nao estiver configurado, o cadastro continua funcionando, mas o e-mail nao e enviado.

Ao rodar localmente sem variaveis do Supabase, o servidor ainda aceita `POST /api/leads` e persiste cada cadastro em `db.json` para teste.
