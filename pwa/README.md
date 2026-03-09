# MedApp PWA (TypeScript)

Port do app Flutter para PWA em TypeScript, preservando a estrutura funcional principal:

- 4 abas: Medicamentos, Exames, Saúde, Sobre
- CRUD de medicação (nome, dosagem, frequência, duração, horário inicial)
- Tratamento por tempo indefinido (duração = 0)
- Cálculo de próxima dose
- Marcar como tomado
- Persistência local (`localStorage`)
- Notificação teste na aba Sobre
- Notificações automáticas no horário das doses (quando permitido pelo navegador)

## Rodar local

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Observações sobre notificações

- No PWA web, notificações dependem de permissão do navegador.
- O comportamento de notificação em segundo plano pode variar por navegador/sistema.
