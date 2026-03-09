export function AboutPage() {
  async function testNotification() {
    const NotificationApi = (window as unknown as { Notification?: typeof Notification })
      .Notification;

    if (!NotificationApi) {
      globalThis.alert('Este navegador não suporta notificações.');
      return;
    }

    const permission =
      NotificationApi.permission === 'granted'
        ? 'granted'
        : await NotificationApi.requestPermission();

    if (permission !== 'granted') {
      globalThis.alert('Permissão de notificação negada.');
      return;
    }

    new NotificationApi('Teste de Notificação', {
      body: 'Esta é uma notificação de teste'
    });
  }

  return (
    <div>
      <h2 className="page-title">MedApp</h2>
      <button className="btn-primary" onClick={testNotification}>
        Disparar Notificação
      </button>
    </div>
  );
}
