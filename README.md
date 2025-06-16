# 💊 MedApp

Aplicativo Flutter multiplataforma para gerenciamento de medicamentos, consultas e exames, com suporte a notificações e armazenamento local ou na nuvem.

---

## 🧠 Visão Geral

O `MedApp` permite:

- Agendar e receber notificações sobre medicamentos, exames e consultas.
- Armazenar dados localmente ou na nuvem (Google).
- Cadastro manual de medicamentos.
- Interface moderna com suporte para Android e Linux.

---

## 🚀 Estado Atual do Projeto

✔️ App funcionando no Android e no Linux  
✔️ Notificações imediatas e agendadas com `flutter_local_notifications`  
✔️ Backup automático antes de modificações com script dedicado  
⏸️ Desenvolvimento pausado em: `checkpoint-2025-06-16`

---

## 📦 Requisitos

- Flutter (SDK instalado e configurado)
- Android SDK + NDK 27.x
- ADB para testes no celular
- Linux (ambiente de desenvolvimento principal)
- VS Code (opcional)

---

## 📁 Estrutura

```
/home/rgarcez/App/medapp/
├── lib/
│   └── medications_page.dart
├── android/
│   └── build.gradle.kts (uso do embedding v2)
├── pubspec.yaml
├── README.md
```

---

## 🛠️ Scripts

Os scripts estão em: `/home/rgarcez/scripts/`

### 🔄 Backup Automático

**Script:** `/home/rgarcez/scripts/backup_medapp.sh`  
**Função:** Cria uma cópia completa do app em `/home/rgarcez/backups/medapp_<data>`  
**Uso:**

```bash
bash /home/rgarcez/scripts/backup_medapp.sh
```

---

### ♻️ Restauração de Backup

**Script:** `/home/rgarcez/scripts/restore_medapp.sh`  
**Função:** Restaura o conteúdo de um backup existente para `/home/rgarcez/App/medapp`  
**Uso:**

```bash
bash /home/rgarcez/scripts/restore_medapp.sh /home/rgarcez/backups/medapp_2025-06-16
```

---

## 📱 Execução e Teste

### Android (padrão)

```bash
flutter devices         # Verifique se o celular está conectado via USB
flutter run             # Executa no celular
```

### Linux (fallback)

```bash
flutter run -d linux
```

---

## ✅ Checklists Futuros

- [ ] UI para gerenciamento de medicamentos
- [ ] Tela de login/autenticação (opcional Google)
- [ ] Sincronização com nuvem (Firebase/Google)
- [ ] Exportação e importação de dados
- [ ] Design responsivo e acessível
- [ ] Avaliação do usuário após 7 dias de uso

---

## 📌 Observações

- O projeto está estruturado com automação de backup e restauração.
- Scripts são executados manualmente via terminal.
- Sempre execute um backup antes de modificações no projeto.

---

© 2025
