import { useEffect, useMemo, useRef, useState } from 'react';
import { Menu } from 'lucide-react';
import { BottomNav } from './components/BottomNav';
import { SideMenu } from './components/SideMenu';
import { type ActivePage, type MainTab } from './nav';
import { DrawerPageRouter } from './pages/DrawerPages';
import { AboutPage } from './pages/AboutPage';
import { AgendaPage } from './pages/AgendaPage';
import { AgendaUnificadaPage } from './pages/AgendaUnificadaPage';
import { MedicationsPage } from './pages/MedicationsPage';
import { loadAuth, loadSettings, saveAuth, saveSettings, trackEvent } from './utils';

type GoogleCredentialPayload = {
  email?: string;
  name?: string;
  picture?: string;
};

type AuthState = {
  email: string;
  signedInAt: string;
  provider?: 'local' | 'google';
  name?: string;
  picture?: string;
};

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

function parseJwtPayload(token: string): GoogleCredentialPayload | null {
  try {
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) return null;
    const normalized = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = decodeURIComponent(
      atob(normalized)
        .split('')
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join('')
    );
    return JSON.parse(decoded) as GoogleCredentialPayload;
  } catch {
    return null;
  }
}

function resolveDisplayName(auth: AuthState | null): string {
  if (auth?.name?.trim()) return auth.name.trim();
  const profileRaw = localStorage.getItem('medapp.profile');
  if (profileRaw) {
    try {
      const parsed = JSON.parse(profileRaw) as { nome?: string };
      if (parsed?.nome?.trim()) return parsed.nome.trim();
    } catch {
      // ignore parse issue
    }
  }
  if (auth?.email?.trim()) return auth.email.split('@')[0];
  return 'Convidado';
}

export default function App() {
  const [tab, setTab] = useState<MainTab>('medications');
  const [activePage, setActivePage] = useState<ActivePage>('medications');
  const [menuOpen, setMenuOpen] = useState(false);
  const [settings, setSettings] = useState(() => loadSettings());
  const [displayPrefsOpen, setDisplayPrefsOpen] = useState(false);
  const [onboardingName, setOnboardingName] = useState('');
  const [onboardingLegalAccepted, setOnboardingLegalAccepted] = useState(false);
  const [onboardingAuthMethod, setOnboardingAuthMethod] = useState<'none' | 'google' | 'local'>('none');
  const [onboardingLocalEmail, setOnboardingLocalEmail] = useState('');
  const [onboardingLocalPassword, setOnboardingLocalPassword] = useState('');
  const [onboardingAuthStatus, setOnboardingAuthStatus] = useState('');
  const [googleReady, setGoogleReady] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [auth, setAuth] = useState<AuthState | null>(() => loadAuth());
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
    const onAuthChanged = () => {
      setAuth(loadAuth());
    };
    window.addEventListener('medapp-auth-changed', onAuthChanged);
    return () => {
      window.removeEventListener('medapp-auth-changed', onAuthChanged);
    };
  }, []);

  useEffect(() => {
    if ((window as any).google) {
      setGoogleReady(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setGoogleReady(true);
    document.head.appendChild(script);
  }, []);

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

  function handleOnboardingLocalSignIn() {
    const email = onboardingLocalEmail.trim().toLowerCase();
    const password = onboardingLocalPassword.trim();
    if (!email || !password) {
      setOnboardingAuthStatus('Informe e-mail e senha para continuar com conta local.');
      return;
    }
    const next = {
      email,
      signedInAt: new Date().toISOString(),
      provider: 'local' as const
    };
    saveAuth(next);
    setAuth(next);
    setOnboardingAuthMethod('local');
    setOnboardingAuthStatus('Conta local ativa. Algumas funções de sincronização ficarão indisponíveis.');
  }

  function handleOnboardingGoogleSignIn() {
    const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '').trim();
    if (!clientId) {
      setOnboardingAuthStatus('Defina VITE_GOOGLE_CLIENT_ID para habilitar login Google.');
      return;
    }
    const googleApi = (window as any).google?.accounts?.id;
    if (!googleApi) {
      setOnboardingAuthStatus('SDK Google ainda não carregou. Tente novamente em instantes.');
      return;
    }

    setGoogleBusy(true);
    setOnboardingAuthStatus('');
    googleApi.initialize({
      client_id: clientId,
      callback: (response: { credential?: string }) => {
        if (!response?.credential) {
          setGoogleBusy(false);
          setOnboardingAuthStatus('Não foi possível concluir login Google.');
          return;
        }
        const payload = parseJwtPayload(response.credential);
        if (!payload?.email) {
          setGoogleBusy(false);
          setOnboardingAuthStatus('Resposta do Google inválida.');
          return;
        }
        const next = {
          email: payload.email,
          signedInAt: new Date().toISOString(),
          provider: 'google' as const,
          name: payload.name,
          picture: payload.picture
        };
        saveAuth(next);
        setAuth(next);
        if (!onboardingName.trim() && payload.name) {
          setOnboardingName(payload.name);
        }
        setOnboardingAuthMethod('google');
        setOnboardingAuthStatus('Conta Google conectada com sucesso.');
        setGoogleBusy(false);
      }
    });
    googleApi.prompt();
  }

  const canFinishOnboarding = onboardingLegalAccepted && onboardingAuthMethod !== 'none';
  const displayName = resolveDisplayName(auth);

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
          <Menu size={20} aria-hidden="true" />
        </button>
        <div className="app-brand-group">
          <span className="app-brand">MedApp</span>
          <span className="user-pill" title={auth?.email || 'Convidado'}>
            {displayName}
          </span>
        </div>
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
        <div className="app-header-right">
          <button className="display-btn" onClick={() => setDisplayPrefsOpen(true)} aria-label="Preferências de tela">
            Aa
          </button>
        </div>
      </header>

      <section className="content">{page}</section>

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

              <div className="card onboarding-auth-card">
                <p className="card-sub" style={{ marginTop: 0 }}>
                  Login recomendado para sincronização e recursos de cuidado
                </p>
                <button
                  className="btn-primary onboarding-google-btn"
                  onClick={handleOnboardingGoogleSignIn}
                  disabled={!googleReady || googleBusy}
                >
                  {googleBusy ? 'Conectando Google...' : 'Entrar com Google (recomendado)'}
                </button>
                <p className="card-sub" style={{ marginBottom: 0 }}>
                  Conta local (opcional, com recursos limitados)
                </p>
                <label>
                  E-mail local
                  <input
                    type="text"
                    value={onboardingLocalEmail}
                    onChange={(e) => setOnboardingLocalEmail(e.target.value)}
                    placeholder="exemplo@email.com"
                  />
                </label>
                <label>
                  Senha local
                  <input
                    type="password"
                    value={onboardingLocalPassword}
                    onChange={(e) => setOnboardingLocalPassword(e.target.value)}
                    placeholder="Senha da conta local"
                  />
                </label>
                <button className="btn-soft" onClick={handleOnboardingLocalSignIn}>
                  Continuar com conta local
                </button>
                <p className="card-sub" style={{ marginBottom: 0 }}>
                  Conta local não tem algumas funções (sincronização em nuvem e vínculos com cuidador/parente).
                </p>
                {onboardingAuthStatus && <p className="card-sub">{onboardingAuthStatus}</p>}
              </div>

              <div className="card" style={{ marginTop: 4 }}>
                <p className="card-sub" style={{ margin: 0 }}>
                  LGPD e Marco Civil: dados locais por padrão, com princípios da Lei 13.709/2018 e diretrizes da Lei
                  12.965/2014.
                </p>
                <p className="card-sub" style={{ marginTop: 8, marginBottom: 0 }}>
                  Aviso: o MedApp é um auxiliar de rotina, não substitui cuidado humano ou orientação médica, e não se
                  responsabiliza por doses não tomadas por falhas do app, telefone, bateria, conectividade, modo
                  silencioso ou indisponibilidade do aparelho.
                </p>
                <label className="checkbox-row" style={{ marginTop: 10 }}>
                  <input
                    type="checkbox"
                    checked={onboardingLegalAccepted}
                    onChange={(e) => setOnboardingLegalAccepted(e.target.checked)}
                  />
                  Li e estou ciente dos termos.
                </label>
              </div>
            </div>

            <div className="row" style={{ marginTop: 14 }}>
              <button className="btn-primary" onClick={finishOnboarding} disabled={!canFinishOnboarding}>
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
