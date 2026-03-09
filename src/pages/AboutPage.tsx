import { useEffect, useMemo, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function isStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches;
}

export function AboutPage() {
  const [installAvailable, setInstallAvailable] = useState<boolean>(
    () => Boolean(window.__medappInstallPrompt)
  );
  const [status, setStatus] = useState('');
  const installLabel = useMemo(() => {
    if (isStandaloneMode()) return 'App já instalado';
    if (installAvailable) return 'Instalar app';
    return 'Instalação indisponível no momento';
  }, [installAvailable]);

  useEffect(() => {
    const onInstallAvailable = () => setInstallAvailable(true);
    const onInstalled = () => {
      setInstallAvailable(false);
      setStatus('MedApp instalado com sucesso.');
    };

    window.addEventListener('medapp-install-available', onInstallAvailable);
    window.addEventListener('medapp-installed', onInstalled);
    return () => {
      window.removeEventListener('medapp-install-available', onInstallAvailable);
      window.removeEventListener('medapp-installed', onInstalled);
    };
  }, []);

  async function ensureNotificationPermission(): Promise<typeof Notification | null> {
    const NotificationApi = (window as unknown as { Notification?: typeof Notification }).Notification;
    if (!NotificationApi) {
      setStatus('Este navegador não suporta notificações.');
      return null;
    }

    const permission =
      NotificationApi.permission === 'granted'
        ? 'granted'
        : await NotificationApi.requestPermission();

    if (permission !== 'granted') {
      setStatus('Permissão de notificação negada. Ative nas configurações do navegador.');
      return null;
    }

    return NotificationApi;
  }

  async function showNotification(title: string, body: string) {
    const api = await ensureNotificationPermission();
    if (!api) return;

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.showNotification(title, { body, tag: 'medapp-about' });
          return;
        }
      }
    } catch {
      // fallback below
    }

    new api(title, { body });
  }

  async function testarNotificacaoInstantanea() {
    setStatus('Enviando notificação instantânea...');
    await showNotification('Notificação Instantânea', 'Esta é uma notificação enviada agora!');
    setStatus('Notificação instantânea disparada.');
  }

  async function testarNotificacaoAgendada() {
    const permission = await ensureNotificationPermission();
    if (!permission) return;

    setStatus('Notificação agendada para 10 segundos.');
    setTimeout(() => {
      void showNotification('Notificação Agendada', 'Essa notificação foi agendada para 10 segundos depois.');
    }, 10_000);
  }

  async function instalarApp() {
    if (isStandaloneMode()) {
      setStatus('O MedApp já está instalado neste dispositivo.');
      return;
    }

    const consentInstall = window.confirm(
      'Antes de instalar: o MedApp segue boas práticas de LGPD para dados locais no dispositivo, mas não substitui orientação médica. O app não se responsabiliza por doses não tomadas por falhas de telefone, bateria, modo silencioso, falta de internet ou indisponibilidade do aparelho. Deseja continuar?'
    );
    if (!consentInstall) {
      setStatus('Instalação cancelada. Revise os termos legais na seção LGPD e conformidade.');
      return;
    }

    const promptEvent = window.__medappInstallPrompt as BeforeInstallPromptEvent | undefined;
    if (!promptEvent) {
      setStatus(
        'Prompt de instalação indisponível. Continue usando o app e tente novamente, ou use o menu do navegador para "Adicionar à tela inicial".'
      );
      return;
    }

    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    window.__medappInstallPrompt = null;
    setInstallAvailable(false);
    setStatus(
      choice.outcome === 'accepted'
        ? 'Instalação confirmada.'
        : 'Instalação cancelada pelo usuário.'
    );
  }

  return (
    <div>
      <h2 className="page-title">Sobre o MedApp</h2>

      <div className="card">
        <p>
          O MedApp é um aplicativo pessoal de saúde em desenvolvimento, pensado para ajudar no
          controle e organização do seu tratamento médico diário.
        </p>
        <p>
          Com ele, você poderá registrar medicamentos, compromissos médicos, vacinas, receitas e
          muito mais, de forma simples, visual e eficiente.
        </p>
        <p>
          Nosso objetivo é permitir que qualquer pessoa consiga gerenciar sua rotina médica com
          autonomia, clareza e segurança, com lembretes e registros.
        </p>
        <p>
          Esta é uma versão inicial. Muitas funcionalidades ainda estão em construção, mas já é
          possível acompanhar os medicamentos e compromissos médicos.
        </p>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3 className="card-title">LGPD e conformidade</h3>
        <ul className="card-sub">
          <li>Os dados são armazenados localmente no seu dispositivo por padrão.</li>
          <li>Você pode exportar, importar ou apagar os dados em Privacidade e Segurança.</li>
          <li>As informações são usadas para operação do app (agenda, lembretes e histórico).</li>
          <li>Você pode solicitar revogação de consentimento desativando recursos opcionais.</li>
          <li>O app não substitui orientação médica profissional.</li>
          <li>
            O MedApp não se responsabiliza por doses não tomadas por falhas de telefone, bateria,
            aparelho em silencioso, bloqueios do sistema operacional ou indisponibilidade de rede/dispositivo.
          </li>
        </ul>
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn-primary" onClick={testarNotificacaoInstantanea}>
          Instantânea
        </button>
        <button className="btn-soft" onClick={testarNotificacaoAgendada}>
          Agendada (10s)
        </button>
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <button className="btn-primary" onClick={instalarApp} disabled={!installAvailable && !isStandaloneMode()}>
          {installLabel}
        </button>
      </div>
      {status && <p className="card-sub">{status}</p>}
      <p className="card-sub">
        Em alguns celulares, o navegador só permite notificação após instalação do app.
      </p>

      <p className="card-sub">Versão atual: 0.1.0-alpha</p>
    </div>
  );
}
