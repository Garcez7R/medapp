# MedApp (PWA)

Aplicativo de saúde em **PWA + TypeScript + React**, com foco em organização de medicações e rotina médica.

Este repositório foi consolidado para manter apenas a versão web (PWA) no `main`.

## Funcionalidades

### Navegação principal
- `Medicamentos`
- `Agenda`
- `Sobre`

### Menu lateral (Mais opções)
- Agenda Médica
- Vacinas
- Diário de Saúde
- Receitas Médicas
- Relatórios
- Central de Notificações
- Perfil e Preferências
- Calendário da Saúde
- Histórico de Atividades
- Privacidade e Segurança

### Recursos já implementados
- CRUD de medicamentos
- Controle de doses por horário (marcar/desmarcar)
- Agenda unificada (Lista, Calendário, Diário)
- Agenda médica com cadastro/edição/exclusão de compromissos
- Páginas laterais funcionais com persistência local (`localStorage`)
- Notificações de teste na página Sobre
- PWA instalável com nome **MedApp** e ícones do app

## Stack
- React 18
- TypeScript
- Vite

## Rodando localmente

```bash
npm install
npm run dev
```

## Build de produção

```bash
npm run build
npm run preview
```

## Estrutura principal

- `src/` código da aplicação
- `public/` manifest, service worker e ícones PWA
- `functions/` APIs de backend para Cloudflare Pages Functions
- `d1/` schema SQL para banco D1
- `index.html` entrada web

## Observações
- O app é offline-first no que depende de dados locais.
- Notificações no navegador dependem de permissão do usuário e suporte da plataforma.

## Sincronização com D1 (Cloudflare)

### 1) Criar banco D1
No terminal (com `wrangler` autenticado):

```bash
npx wrangler d1 create medapp-db
```

Guarde o `database_id` retornado.

### 2) Vincular D1 no projeto Pages
No painel Cloudflare Pages:

1. Abra o projeto do `medapp`.
2. Vá em `Settings` → `Functions` → `D1 bindings`.
3. Adicione binding:
   - `Variable name`: `MEDAPP_DB`
   - `D1 database`: `medapp-db` (ou o nome que você criou).
4. Salve para `Production` (e `Preview`, se quiser testar antes).

### 3) Aplicar schema

```bash
npx wrangler d1 execute medapp-db --file=d1/schema.sql
```

### 4) Exigir conta Google para sync
- A UI de sync no app já exige usuário autenticado com `provider = google`.
- Configure `VITE_GOOGLE_CLIENT_ID` no Cloudflare Pages para ativar login Google.

### 5) Fluxo no app
- `Perfil e Preferências` → `Sincronização em nuvem (D1)`:
  - `Enviar dados para nuvem`
  - `Baixar dados da nuvem`
