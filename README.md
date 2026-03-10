# MedApp (PWA)

Aplicativo de saúde em **PWA + React + TypeScript** para acompanhamento de medicamentos, agenda e rotina de cuidados.

Este repositório mantém a versão web oficial (PWA) no branch `main`.

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
- Histórico de Atividades
- Privacidade e Segurança
- Instalar app

### Recursos implementados
- CRUD de medicamentos
- Controle de doses do dia (`Tomar`, `Adiar 10m`, `Pular`, `Desfazer`)
- Agenda unificada com `Lista`, `Calendário` e `Diário`
- Inclusão rápida de evento direto no modo calendário
- Agenda médica com recorrência por dias
- Recorrência com:
  - número de ocorrências
  - opção `Indefinida (crônico)` (gera as próximas datas automaticamente)
- Login local opcional
- Login com Google (seletor de conta)
- Vínculos de cuidado (`parente`, `responsavel`, `cuidador`)
- Sincronização em nuvem com Cloudflare D1
- PWA instalável com ícones e atualização de cache/versionamento
- Controles de privacidade (PIN, biometria quando disponível, export/import de dados)

## Stack
- React 18
- TypeScript
- Vite
- Cloudflare Pages Functions
- Cloudflare D1

## Executar localmente

```bash
npm install
npm run dev
```

## Build de produção

```bash
npm run build
npm run preview
```

## Testes

```bash
npm test -- --run
```

## Estrutura do projeto

- `src/` código da aplicação
- `public/` manifest, service worker e ícones PWA
- `functions/` APIs para Pages Functions
- `d1/` schema SQL do banco D1
- `index.html` entrada web

## Variáveis de ambiente

No Cloudflare Pages (Production/Preview):

- `VITE_GOOGLE_CLIENT_ID`: Client ID OAuth Web do Google

> Não use `client_secret` no frontend.

## Cloudflare D1 (sincronização)

### 1) Criar banco

```bash
npx wrangler d1 create medapp-db
```

### 2) Aplicar schema

```bash
npx wrangler d1 execute medapp-db --file=d1/schema.sql --remote
```

### 3) Configurar binding no Pages

No painel do projeto `medapp`:

- `Settings` -> `Functions` -> `D1 bindings`
- Adicionar:
  - `Variable name`: `MEDAPP_DB`
  - `D1 database`: `medapp-db`

### 4) Fluxo no app

`Perfil e Preferências` -> `Sincronização em nuvem (D1)`:
- `Enviar dados para nuvem`
- `Baixar dados da nuvem`

## Vínculos de cuidado

- Paciente gera convite com papel:
  - `parente`: leitura
  - `responsavel`: leitura e edição
  - `cuidador`: leitura e edição
- Convidado aceita código no próprio app
- Paciente pode revogar vínculo
- Sync permite escolher `minha conta` ou paciente vinculado

## Observações

- O app é orientado a dados locais e funciona bem offline para recursos locais.
- Notificações dependem de permissão e suporte do navegador/sistema.
- O MedApp é um auxiliar de rotina e não substitui orientação médica ou cuidado humano.
- Tratamento de dados pessoais com base em princípios da LGPD (Lei 13.709/2018) e diretrizes do Marco Civil da Internet (Lei 12.965/2014).
- O app não se responsabiliza por doses não tomadas em caso de falhas do app, bateria, telefone, conectividade, modo silencioso ou indisponibilidade do dispositivo.
