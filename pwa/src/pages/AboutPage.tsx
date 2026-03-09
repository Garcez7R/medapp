export function AboutPage() {
  async function ensureNotificationPermission(): Promise<typeof Notification | null> {
    const NotificationApi = (window as unknown as { Notification?: typeof Notification }).Notification;
    if (!NotificationApi) {
      globalThis.alert('Este navegador não suporta notificações.');
      return null;
    }

    const permission =
      NotificationApi.permission === 'granted'
        ? 'granted'
        : await NotificationApi.requestPermission();

    if (permission !== 'granted') {
      globalThis.alert('Permissão de notificação negada.');
      return null;
    }

    return NotificationApi;
  }

  async function testarNotificacaoInstantanea() {
    const api = await ensureNotificationPermission();
    if (!api) return;
    new api('Notificação Instantânea', {
      body: 'Esta é uma notificação enviada agora!'
    });
  }

  async function testarNotificacaoAgendada() {
    const api = await ensureNotificationPermission();
    if (!api) return;

    setTimeout(() => {
      new api('Notificação Agendada', {
        body: 'Essa notificação foi agendada para 10 segundos depois.'
      });
    }, 10_000);

    globalThis.alert('Notificação agendada para daqui a 10 segundos.');
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

      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn-primary" onClick={testarNotificacaoInstantanea}>
          Instantânea
        </button>
        <button className="btn-soft" onClick={testarNotificacaoAgendada}>
          Agendada (10s)
        </button>
      </div>

      <p className="card-sub">Versão atual: 0.1.0-alpha</p>
    </div>
  );
}
