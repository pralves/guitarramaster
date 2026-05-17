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

## Estrutura

- `index.html`: pagina principal em UTF-8.
- `assets/`: CSS, imagens e bibliotecas locais.
- `js/landing.js`: modal de captura e rolagem suave.
- `scripts/build.mjs`: copia os arquivos publicaveis para `dist`.
- `scripts/preview.mjs`: servidor local simples para conferir o build.
- `db.json`: base local onde o preview grava os cadastros enviados para `/api/leads`.

## Cadastro local

Os botoes "Garantir minha vaga" e "Quero ser um Guitarra Master" abrem o formulario de interessados. Ao rodar `npm.cmd run preview`, o servidor aceita `POST /api/leads` e persiste cada cadastro em `db.json`.
