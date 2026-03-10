import { useEffect, useMemo, useRef, useState } from 'react';
import { LEGAL_TERMS_VERSION, loadLegalAcceptance } from '../legal';

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
  const legalAcceptance = useMemo(() => loadLegalAcceptance(), []);
  const scheduledTimerRef = useRef<number | null>(null);
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
      if (scheduledTimerRef.current) {
        window.clearTimeout(scheduledTimerRef.current);
      }
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
        const registration = await navigator.serviceWorker.ready;
        if (registration) {
          await registration.showNotification(
            title,
            {
              body,
              tag: `medapp-about-${Date.now()}`,
              requireInteraction: true,
              vibrate: [200, 100, 200],
              badge: '/medapp-launcher-192-v2.png',
              icon: '/medapp-launcher-192-v2.png'
            } as NotificationOptions
          );
          return;
        }
      }
    } catch {
      // fallback below
    }

    new api(
      title,
      {
        body,
        tag: `medapp-about-${Date.now()}`,
        requireInteraction: true,
        vibrate: [200, 100, 200]
      } as NotificationOptions
    );
  }

  async function testarNotificacaoInstantanea() {
    setStatus('Enviando notificação instantânea...');
    await showNotification('Notificação Instantânea', 'Esta é uma notificação enviada agora!');
    setStatus('Notificação instantânea disparada.');
  }

  async function testarNotificacaoAgendada() {
    const permission = await ensureNotificationPermission();
    if (!permission) return;

    if (scheduledTimerRef.current) {
      window.clearTimeout(scheduledTimerRef.current);
      scheduledTimerRef.current = null;
    }

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const worker = registration.active ?? navigator.serviceWorker.controller;
        if (worker) {
          worker.postMessage({
            type: 'medapp-schedule-notification',
            delayMs: 10_000,
            title: 'Notificação Agendada',
            body: 'Essa notificação foi agendada para 10 segundos depois.'
          });
          setStatus('Notificação agendada para 10 segundos.');
          return;
        }
      }
    } catch {
      // fallback below
    }

    setStatus('Notificação agendada para 10 segundos (modo compatível).');
    scheduledTimerRef.current = window.setTimeout(() => {
      void showNotification('Notificação Agendada', 'Essa notificação foi agendada para 10 segundos depois.');
      setStatus('Notificação agendada disparada.');
      scheduledTimerRef.current = null;
    }, 10_000);
  }

  async function instalarApp() {
    if (isStandaloneMode()) {
      setStatus('O MedApp já está instalado neste dispositivo.');
      return;
    }

    const consentInstall = window.confirm(
      'Antes de instalar: o MedApp é um app auxiliar de rotina, não substitui cuidado humano nem orientação médica. O tratamento de dados segue princípios da LGPD (Lei 13.709/2018) e diretrizes do Marco Civil da Internet (Lei 12.965/2014). O app não se responsabiliza por doses não tomadas por falhas de telefone, bateria, conectividade, modo silencioso, bloqueios do sistema ou indisponibilidade do aparelho. Deseja continuar?'
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
        <h3 className="card-title">Visao geral</h3>
        <p className="card-sub">
          O MedApp ajuda a organizar medicações e rotina de cuidados de forma simples, com lembretes e registros.
        </p>
        <div className="med-card-meta">
          <span>Medicamentos e doses</span>
          <span>Agenda e compromissos</span>
          <span>Vacinas e receitas</span>
          <span>Diario de saúde</span>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3 className="card-title">Acoes rapidas</h3>
        <p className="card-sub">Teste as notificacoes e confirme a instalacao do app.</p>
        <div className="row" style={{ marginTop: 6 }}>
          <button className="btn-primary" onClick={testarNotificacaoInstantanea}>
            Instantanea
          </button>
          <button className="btn-soft" onClick={testarNotificacaoAgendada}>
            Agendada (10s)
          </button>
          <button className="btn-primary" onClick={instalarApp} disabled={!installAvailable && !isStandaloneMode()}>
            {installLabel}
          </button>
        </div>
        {status && <p className="card-sub">{status}</p>}
        <p className="card-sub">
          Em alguns celulares, o navegador so permite notificacao apos instalacao. Para alertas mais fortes, ative som
          e destaque do MedApp nas configuracoes de notificacoes do Android.
        </p>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3 className="card-title">LGPD e conformidade</h3>
        <p className="card-sub">Versão atual dos termos: {LEGAL_TERMS_VERSION}</p>
        {legalAcceptance && (
          <p className="card-sub">
            Aceite registrado: {new Date(legalAcceptance.acceptedAt).toLocaleString('pt-BR')}
          </p>
        )}
        <ul className="card-sub">
          <li>Os dados são armazenados localmente no seu dispositivo por padrão.</li>
          <li>Tratamento de dados baseado em princípios da LGPD (Lei 13.709/2018).</li>
          <li>Uso do serviço alinhado às diretrizes do Marco Civil da Internet (Lei 12.965/2014).</li>
          <li>Você pode exportar, importar ou apagar os dados em Privacidade e Segurança.</li>
          <li>As informações são usadas para operação do app (agenda, lembretes e histórico).</li>
          <li>Você pode solicitar revogação de consentimento desativando recursos opcionais.</li>
          <li>O MedApp é um auxiliar de rotina e não substitui cuidado humano ou orientação médica profissional.</li>
          <li>
            O MedApp não se responsabiliza por doses não tomadas por falhas do app, telefone, bateria, conectividade,
            aparelho em silencioso, bloqueios do sistema operacional ou indisponibilidade de rede/dispositivo.
          </li>
        </ul>
      </div>

      <p className="card-sub" style={{ marginTop: 12 }}>
        Versao atual: 0.1.0-alpha
      </p>
    </div>
  );
}
