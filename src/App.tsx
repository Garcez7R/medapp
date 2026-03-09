import { useEffect, useMemo, useRef, useState } from 'react';
import { BottomNav } from './components/BottomNav';
import { SideMenu } from './components/SideMenu';
import { type ActivePage, type MainTab } from './nav';
import { DrawerPageRouter } from './pages/DrawerPages';
import { AboutPage } from './pages/AboutPage';
import { AgendaPage } from './pages/AgendaPage';
import { AgendaUnificadaPage } from './pages/AgendaUnificadaPage';
import { MedicationsPage } from './pages/MedicationsPage';
import { loadSettings, saveSettings, trackEvent } from './utils';

export default function App() {
  const [tab, setTab] = useState<MainTab>('medications');
  const [activePage, setActivePage] = useState<ActivePage>('medications');
  const [menuOpen, setMenuOpen] = useState(false);
  const [settings, setSettings] = useState(() => loadSettings());
  const [displayPrefsOpen, setDisplayPrefsOpen] = useState(false);
  const [onboardingName, setOnboardingName] = useState('');
  const swipeStartRef = useRef<{ x: number; y: number; fromOpenMenu: boolean } | null>(null);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    trackEvent('page_view', `Página ativa: ${activePage}`);
  }, [activePage]);

  const page = useMemo(() => {
    if (activePage === 'medications') return <MedicationsPage />;
    if (activePage === 'agenda') return <AgendaUnificadaPage />;
    if (activePage === 'about') return <AboutPage />;
    if (activePage === 'agenda_medica') return <AgendaPage />;
    return <DrawerPageRouter pageKey={activePage} />;
  }, [activePage]);

  function handleTabChange(next: MainTab) {
    setTab(next);
    setActivePage(next);
  }

  const mainTabs: Array<{ key: MainTab; label: string }> = [
    { key: 'medications', label: 'Medicamentos' },
    { key: 'agenda', label: 'Agenda' },
    { key: 'about', label: 'Sobre' }
  ];

  function handleTouchStart(event: React.TouchEvent<HTMLElement>) {
    const touch = event.changedTouches[0];
    const fromOpenMenu = menuOpen;
    swipeStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      fromOpenMenu
    };
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLElement>) {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start) return;

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;

    if (Math.abs(deltaY) > Math.abs(deltaX)) return;

    const startedAtEdge = start.x <= 28;
    const openedBySwipe = !start.fromOpenMenu && startedAtEdge && deltaX > 70;
    const closedBySwipe = start.fromOpenMenu && deltaX < -70;

    if (openedBySwipe) setMenuOpen(true);
    if (closedBySwipe) setMenuOpen(false);
  }

  async function finishOnboarding() {
    if (settings.requestNotifications && typeof Notification !== 'undefined') {
      try {
        await Notification.requestPermission();
      } catch {
        // ignore permission errors
      }
    }

    if (onboardingName.trim()) {
      localStorage.setItem(
        'medapp.profile',
        JSON.stringify({
          nome: onboardingName.trim(),
          email: '',
          telefone: '',
          nascimento: '',
          tipoSanguineo: '',
          contatoEmergencia: ''
        })
      );
    }

    setSettings((prev) => ({ ...prev, onboardingDone: true }));
    trackEvent('onboarding_completed', 'Onboarding inicial concluído');
  }

  return (
    <main
      className={`app-shell ${settings.highContrast ? 'high-contrast' : ''}`}
      style={{ fontSize: `${settings.fontScale}rem` }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {!menuOpen && <div className="edge-swipe-zone" aria-hidden="true" />}

      <header className="app-header">
        <button className="menu-btn" onClick={() => setMenuOpen(true)} aria-label="Abrir menu lateral">
          ☰
        </button>
        <span>MedApp</span>
        <nav className="desktop-tabs" aria-label="Navegação principal desktop">
          {mainTabs.map((item) => (
            <button
              key={item.key}
              className={`desktop-tab-btn ${tab === item.key ? 'active' : ''}`}
              onClick={() => handleTabChange(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <button className="display-btn" onClick={() => setDisplayPrefsOpen(true)} aria-label="Preferências de tela">
          Aa
        </button>
      </header>

      <section className="content">{page}</section>

      <section className="legal-persistent" role="note" aria-label="Aviso legal">
        LGPD: dados pessoais ficam no dispositivo por padrão. Aviso: o MedApp não substitui orientação médica
        e não se responsabiliza por doses não tomadas por falhas de telefone, bateria, silencioso ou indisponibilidade do aparelho.
      </section>

      <BottomNav currentTab={tab} onChange={handleTabChange} />

      <SideMenu
        open={menuOpen}
        activePage={activePage}
        onClose={() => setMenuOpen(false)}
        onSelect={(pageKey) => setActivePage(pageKey)}
      />

      {!settings.onboardingDone && (
        <div className="modal-backdrop" onClick={() => undefined}>
          <section className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="page-title">Bem-vindo ao MedApp</h2>
            <p className="card-sub">Configure rapidamente sua experiência inicial.</p>

            <div className="form-grid">
              <label>
                Como você prefere ser chamado?
                <input
                  type="text"
                  value={onboardingName}
                  onChange={(e) => setOnboardingName(e.target.value)}
                  placeholder="Ex: Seu nome"
                />
              </label>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={settings.requestNotifications}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, requestNotifications: e.target.checked }))
                  }
                />
                Ativar lembretes de notificações
              </label>

              <label>
                Tamanho de fonte inicial
                <select
                  value={settings.fontScale}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, fontScale: Number(e.target.value) || 1 }))
                  }
                >
                  <option value={0.95}>Compacto</option>
                  <option value={1}>Padrão</option>
                  <option value={1.1}>Confortável</option>
                  <option value={1.2}>Acessível</option>
                </select>
              </label>
            </div>

            <div className="row" style={{ marginTop: 14 }}>
              <button className="btn-primary" onClick={finishOnboarding}>
                Finalizar configuração
              </button>
            </div>
          </section>
        </div>
      )}

      {displayPrefsOpen && (
        <div className="modal-backdrop" onClick={() => setDisplayPrefsOpen(false)}>
          <section className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="page-title">Preferências de tela</h2>
            <div className="form-grid">
              <label>
                Tamanho da fonte
                <select
                  value={settings.fontScale}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, fontScale: Number(e.target.value) || 1 }))
                  }
                >
                  <option value={0.95}>Compacto</option>
                  <option value={1}>Padrão</option>
                  <option value={1.1}>Confortável</option>
                  <option value={1.2}>Acessível</option>
                </select>
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={settings.highContrast}
                  onChange={(e) => setSettings((prev) => ({ ...prev, highContrast: e.target.checked }))}
                />
                Alto contraste
              </label>
            </div>
            <div className="row" style={{ marginTop: 14 }}>
              <button className="btn-primary" onClick={() => setDisplayPrefsOpen(false)}>
                Fechar
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
