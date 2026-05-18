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

A aplicacao sobe em `http://localhost:4174`. Os cadastros ficam persistidos no volume nomeado `guitarramaster_data`, usando `DB_PATH=/app/data/db.json`.

## Estrutura

- `index.html`: pagina principal em UTF-8.
- `assets/`: CSS, imagens e bibliotecas locais.
- `js/landing.js`: modal de captura e rolagem suave.
- `scripts/build.mjs`: copia os arquivos publicaveis para `dist`.
- `scripts/preview.mjs`: servidor local simples para conferir o build.
- `db.json`: base local onde o preview grava os cadastros enviados para `/api/leads`.

## Cadastro local

Os botoes "Garantir minha vaga" e "Quero ser um Guitarra Master" abrem o formulario de interessados. Ao rodar `npm.cmd run preview`, o servidor aceita `POST /api/leads` e persiste cada cadastro em `db.json`.
