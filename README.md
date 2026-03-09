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
- Assistente de Saúde

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
- `index.html` entrada web

## Observações
- O app é offline-first no que depende de dados locais.
- Notificações no navegador dependem de permissão do usuário e suporte da plataforma.
