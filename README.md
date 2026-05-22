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

Ao rodar localmente sem variaveis do Supabase, o servidor ainda aceita `POST /api/leads` e persiste cada cadastro em `db.json` para teste.
