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

type AppPrivacyConfig = {
  lockEnabled: boolean;
  lockScope: 'all' | 'sensitive';
  lockRememberHours: 0 | 8 | 24;
  preferBiometric: boolean;
};

const LOCK_UNTIL_KEY = 'medapp.lock.until';
const BIOMETRIC_CREDENTIAL_KEY = 'medapp.lock.biometric.credentialId';
const SENSITIVE_PAGES = new Set<ActivePage>([
  'perfil',
  'privacidade',
  'relatorios',
  'historico',
  'central_notificacoes'
]);

function readPrivacyConfig(): AppPrivacyConfig {
  try {
    const raw = localStorage.getItem('medapp.privacy');
    const parsed = raw ? (JSON.parse(raw) as Partial<AppPrivacyConfig>) : {};
    return {
      lockEnabled: Boolean(parsed.lockEnabled),
      lockScope: parsed.lockScope === 'sensitive' ? 'sensitive' : 'all',
      lockRememberHours:
        parsed.lockRememberHours === 8 || parsed.lockRememberHours === 24 ? parsed.lockRememberHours : 0,
      preferBiometric: Boolean(parsed.preferBiometric)
    };
  } catch {
    return {
      lockEnabled: false,
      lockScope: 'all',
      lockRememberHours: 0,
      preferBiometric: false
    };
  }
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const normalized = padded + '='.repeat((4 - (padded.length % 4)) % 4);
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export default function App() {
  const [tab, setTab] = useState<MainTab>('medications');
  const [activePage, setActivePage] = useState<ActivePage>('medications');
  const [menuOpen, setMenuOpen] = useState(false);
  const [settings, setSettings] = useState(() => loadSettings());
  const [displayPrefsOpen, setDisplayPrefsOpen] = useState(false);
  const [onboardingName, setOnboardingName] = useState('');
  const [unlockPin, setUnlockPin] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [locked, setLocked] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const swipeStartRef = useRef<{ x: number; y: number; fromOpenMenu: boolean } | null>(null);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    trackEvent('page_view', `Página ativa: ${activePage}`);
  }, [activePage]);

  useEffect(() => {
    const evaluateLock = () => {
      const privacy = readPrivacyConfig();
      const pin = localStorage.getItem('medapp.lock.pin');
      if (!privacy.lockEnabled || !pin) {
        setLocked(false);
        return;
      }

      if (privacy.lockScope === 'sensitive' && !SENSITIVE_PAGES.has(activePage)) {
        setLocked(false);
        return;
      }

      const unlockUntil = Number(localStorage.getItem(LOCK_UNTIL_KEY) ?? '0');
      if (Number.isFinite(unlockUntil) && unlockUntil > Date.now()) {
        setLocked(false);
        return;
      }

      setLocked(true);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        evaluateLock();
      }
    };

    evaluateLock();
    window.addEventListener('storage', evaluateLock);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('storage', evaluateLock);
      document.removeEventListener('visibilitychange', onVisibility);
    };
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

  function unlockApp() {
    const savedPin = localStorage.getItem('medapp.lock.pin') ?? '';
    const privacy = readPrivacyConfig();
    if (!savedPin) {
      setLocked(false);
      return;
    }
    if (unlockPin.trim() !== savedPin) {
      setUnlockError('PIN inválido.');
      return;
    }
    setUnlockError('');
    setUnlockPin('');
    if (privacy.lockRememberHours > 0) {
      localStorage.setItem(
        LOCK_UNTIL_KEY,
        String(Date.now() + privacy.lockRememberHours * 60 * 60 * 1000)
      );
    } else {
      localStorage.removeItem(LOCK_UNTIL_KEY);
    }
    setLocked(false);
  }

  async function unlockWithBiometric() {
    const credentialId = localStorage.getItem(BIOMETRIC_CREDENTIAL_KEY);
    if (!credentialId) {
      setUnlockError('Biometria não configurada neste dispositivo.');
      return;
    }
    if (typeof PublicKeyCredential === 'undefined' || !navigator.credentials?.get) {
      setUnlockError('Biometria não suportada neste navegador.');
      return;
    }

    try {
      setBiometricBusy(true);
      setUnlockError('');
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: challenge as unknown as BufferSource,
          allowCredentials: [
            { type: 'public-key', id: base64UrlToBytes(credentialId) as unknown as BufferSource }
          ],
          userVerification: 'preferred',
          timeout: 60_000
        }
      });
      if (!assertion) {
        setUnlockError('Não foi possível validar biometria.');
        return;
      }
      unlockApp();
    } catch {
      setUnlockError('Falha na validação biométrica.');
    } finally {
      setBiometricBusy(false);
    }
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

      {locked && (
        <div className="modal-backdrop" onClick={() => undefined}>
          <section className="modal lock-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="page-title">App bloqueado</h2>
            <p className="card-sub">Digite seu PIN para continuar.</p>
            <label>
              PIN
              <input
                type="password"
                inputMode="numeric"
                value={unlockPin}
                onChange={(e) => {
                  setUnlockPin(e.target.value.replace(/\D/g, ''));
                  if (unlockError) setUnlockError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') unlockApp();
                }}
                placeholder="PIN de desbloqueio"
              />
            </label>
            {unlockError && <p className="card-sub legal-error">{unlockError}</p>}
            <div className="row" style={{ marginTop: 14 }}>
              <button className="btn-primary" onClick={unlockApp}>
                Desbloquear
              </button>
              {readPrivacyConfig().preferBiometric && (
                <button className="btn-soft" onClick={() => void unlockWithBiometric()} disabled={biometricBusy}>
                  {biometricBusy ? 'Validando...' : 'Usar biometria'}
                </button>
              )}
            </div>
          </section>
        </div>
      )}

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
