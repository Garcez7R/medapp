import { useEffect, useMemo, useState } from 'react';
import type { DrawerPageKey } from '../nav';
import {
  clearAllMedappData,
  createId,
  exportAllMedappData,
  importAllMedappData,
  loadAgendaItems,
  loadAnalyticsEvents,
  loadAuth,
  loadMedications,
  loadSettings,
  saveAuth,
  saveSettings,
  trackEvent
} from '../utils';

type Item = { id: string; title: string; subtitle?: string; details?: string; date?: string };

type ProfileData = {
  nome: string;
  email: string;
  telefone: string;
  nascimento: string;
  tipoSanguineo: string;
  contatoEmergencia: string;
};

type PrivacyData = {
  lockEnabled: boolean;
  analyticsEnabled: boolean;
  cloudBackup: boolean;
};

type GoogleCredentialPayload = {
  email?: string;
  name?: string;
  picture?: string;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => {
            requestAccessToken: (options?: { prompt?: string }) => void;
          };
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              width?: number | string;
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
            }
          ) => void;
          prompt: (listener?: (notification: unknown) => void) => void;
        };
      };
    };
  }
}

function readJson<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
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

function useCrudState(storageKey: string) {
  const [items, setItems] = useState<Item[]>(() => readJson<Item[]>(storageKey, []));

  const save = (next: Item[]) => {
    setItems(next);
    writeJson(storageKey, next);
  };

  const add = (item: Omit<Item, 'id'>) => {
    const next = [{ id: createId(), ...item }, ...items];
    save(next);
    trackEvent('crud_add', `Item adicionado em ${storageKey}`);
  };

  const remove = (id: string) => {
    save(items.filter((i) => i.id !== id));
    trackEvent('crud_remove', `Item removido em ${storageKey}`);
  };

  return { items, add, remove };
}

function CrudPage(props: {
  title: string;
  storageKey: string;
  emptyText: string;
  fields: Array<{ key: 'title' | 'subtitle' | 'details' | 'date'; label: string; type?: 'text' | 'date' }>;
}) {
  const { title, storageKey, emptyText, fields } = props;
  const { items, add, remove } = useCrudState(storageKey);
  const [form, setForm] = useState<Record<string, string>>(() =>
    fields.reduce<Record<string, string>>((acc, field) => {
      acc[field.key] = '';
      return acc;
    }, {})
  );

  function updateField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit() {
    if (!form.title?.trim()) {
      window.alert('Preencha o campo principal.');
      return;
    }

    add({
      title: form.title.trim(),
      subtitle: form.subtitle?.trim() || undefined,
      details: form.details?.trim() || undefined,
      date: form.date || undefined
    });

    setForm(
      fields.reduce<Record<string, string>>((acc, field) => {
        acc[field.key] = '';
        return acc;
      }, {})
    );
  }

  return (
    <div>
      <h2 className="page-title">{title}</h2>

      <div className="card form-grid">
        {fields.map((field) => (
          <label key={field.key}>
            {field.label}
            <input
              type={field.type ?? 'text'}
              value={form[field.key] ?? ''}
              onChange={(e) => updateField(field.key, e.target.value)}
            />
          </label>
        ))}

        <button className="btn-primary" onClick={onSubmit}>
          Adicionar
        </button>
      </div>

      {items.length === 0 && <p className="empty">{emptyText}</p>}

      <div className="med-list" style={{ marginTop: 12 }}>
        {items.map((item) => (
          <article className="card" key={item.id}>
            <h3 className="card-title">{item.title}</h3>
            {item.subtitle && <p className="card-sub">{item.subtitle}</p>}
            {item.details && <p className="card-sub">{item.details}</p>}
            {item.date && <p className="card-sub">Data: {item.date}</p>}
            <button className="btn-danger" onClick={() => remove(item.id)}>
              Remover
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

function ReportsPage() {
  const meds = loadMedications();
  const agenda = loadAgendaItems();
  const events = loadAnalyticsEvents();
  const dosesTotal = meds.reduce((sum, med) => sum + Math.max(1, Math.floor(24 / med.frequency)) * med.duration, 0);
  const takenTotal = meds.reduce((sum, med) => sum + med.dosesTakenStrings.length, 0);

  const summary = `Medicações ativas: ${meds.length}\nCompromissos na agenda: ${agenda.length}\nDoses previstas: ${dosesTotal}\nDoses marcadas como tomadas: ${takenTotal}\nEventos de uso registrados: ${events.length}`;

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summary);
      window.alert('Resumo copiado para a área de transferência.');
    } catch {
      window.alert('Não foi possível copiar automaticamente.');
    }
  }

  return (
    <div>
      <h2 className="page-title">Relatórios</h2>
      <div className="card">
        <p>{summary}</p>
        <button className="btn-primary" onClick={copySummary}>
          Copiar resumo
        </button>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <h3 className="card-title">Últimos eventos</h3>
        {events.slice(0, 10).map((event) => (
          <p key={event.id} className="card-sub">
            [{new Date(event.createdAt).toLocaleString('pt-BR')}] {event.message}
          </p>
        ))}
        {events.length === 0 && <p className="card-sub">Nenhum evento registrado.</p>}
      </div>
    </div>
  );
}

function NotificationsCenterPage() {
  const custom = readJson<Item[]>('medapp.notifications.custom', []);
  const [items, setItems] = useState<Item[]>(custom);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');

  const meds = loadMedications();
  const agenda = loadAgendaItems();

  const generated = useMemo<Item[]>(() => {
    const medItems = meds.slice(0, 5).map((med) => ({
      id: `med-${med.id}`,
      title: `Lembrete: ${med.name}`,
      subtitle: `Dose ${med.dosage} às ${med.time}`
    }));

    const agendaItems = agenda.slice(0, 5).map((event) => ({
      id: `ag-${event.id}`,
      title: `Compromisso: ${event.compromisso}`,
      subtitle: `${event.data} ${event.hora}`
    }));

    return [...medItems, ...agendaItems];
  }, [agenda, meds]);

  function save(next: Item[]) {
    setItems(next);
    writeJson('medapp.notifications.custom', next);
  }

  function addCustom() {
    if (!title.trim()) return;
    save([{ id: createId(), title: title.trim(), date: date || undefined }, ...items]);
    setTitle('');
    setDate('');
    trackEvent('custom_notification_added', 'Novo lembrete customizado salvo');
  }

  return (
    <div>
      <h2 className="page-title">Central de Notificações</h2>

      <div className="card form-grid">
        <label>
          Novo lembrete
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          Data
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <button className="btn-primary" onClick={addCustom}>
          Salvar lembrete
        </button>
      </div>

      <div className="med-list" style={{ marginTop: 12 }}>
        {generated.map((item) => (
          <article className="card" key={item.id}>
            <h3 className="card-title">{item.title}</h3>
            {item.subtitle && <p className="card-sub">{item.subtitle}</p>}
          </article>
        ))}
        {items.map((item) => (
          <article className="card" key={item.id}>
            <h3 className="card-title">{item.title}</h3>
            {item.date && <p className="card-sub">Data: {item.date}</p>}
            <button className="btn-danger" onClick={() => save(items.filter((i) => i.id !== item.id))}>
              Remover
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData>(() =>
    readJson<ProfileData>('medapp.profile', {
      nome: '',
      email: '',
      telefone: '',
      nascimento: '',
      tipoSanguineo: '',
      contatoEmergencia: ''
    })
  );
  const [auth, setAuth] = useState(() => loadAuth());
  const [password, setPassword] = useState('');
  const [googleClientId, setGoogleClientId] = useState(
    () => localStorage.getItem('medapp.google.clientId') ?? ''
  );
  const [googleReady, setGoogleReady] = useState(false);
  const [settings, setSettingsState] = useState(() => loadSettings());
  const [googleConfigured, setGoogleConfigured] = useState(false);
  const [googleError, setGoogleError] = useState('');
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleRenderNonce, setGoogleRenderNonce] = useState(0);

  useEffect(() => {
    if (window.google) {
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
    if (!googleReady || !googleClientId.trim() || !window.google) {
      setGoogleConfigured(false);
      return;
    }

    const container = document.getElementById('medapp-google-login-button');
    if (!container) return;

    setGoogleError('');
    setGoogleConfigured(false);
    container.innerHTML = '';

    window.google.accounts.id.initialize({
      client_id: googleClientId.trim(),
      callback: ({ credential }) => {
        if (!credential) {
          setGoogleError('Não foi possível concluir o login com Google.');
          return;
        }
        const payload = parseJwtPayload(credential);
        if (!payload?.email) {
          setGoogleError('Resposta do Google inválida.');
          return;
        }

        const next = {
          email: payload.email,
          signedInAt: new Date().toISOString(),
          provider: 'google' as const,
          name: payload.name,
          picture: payload.picture
        };

        setAuth(next);
        saveAuth(next);
        setGoogleBusy(false);
        setGoogleError('');
        trackEvent('auth_login_google', `Login com Google: ${next.email}`);
      }
    });

    window.google.accounts.id.renderButton(container, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      width: 320,
      text: 'signin_with',
      shape: 'pill'
    });
    setGoogleConfigured(true);
  }, [googleReady, googleClientId, googleRenderNonce]);

  function save() {
    writeJson('medapp.profile', profile);
    window.alert('Perfil salvo com sucesso.');
    trackEvent('profile_saved', 'Perfil atualizado pelo usuário');
  }

  function update<K extends keyof ProfileData>(key: K, value: ProfileData[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  function signIn() {
    if (!profile.email.trim() || !password.trim()) {
      window.alert('Informe e-mail e senha para login opcional.');
      return;
    }
    const next = {
      email: profile.email.trim(),
      signedInAt: new Date().toISOString(),
      provider: 'local' as const
    };
    setAuth(next);
    saveAuth(next);
    setPassword('');
    trackEvent('auth_login', `Login local realizado: ${next.email}`);
  }

  function signOut() {
    setAuth(null);
    saveAuth(null);
    trackEvent('auth_logout', 'Logout local realizado');
  }

  function setUiSettings(next: typeof settings) {
    setSettingsState(next);
    saveSettings(next);
    trackEvent('ui_settings', 'Preferências de acessibilidade atualizadas');
  }

  function startGoogleSignIn() {
    if (!googleClientId.trim()) {
      window.alert('Informe o Google Client ID para habilitar login com Google.');
      return;
    }

    localStorage.setItem('medapp.google.clientId', googleClientId.trim());

    if (!window.google || !googleConfigured) {
      window.alert('SDK do Google ainda não carregou. Tente novamente em alguns segundos.');
      return;
    }

    setGoogleBusy(true);
    setGoogleError('');
    window.google.accounts.id.prompt();
  }

  return (
    <div>
      <h2 className="page-title">Perfil e Preferências</h2>
      <div className="card form-grid">
        <label>
          Nome
          <input type="text" value={profile.nome} onChange={(e) => update('nome', e.target.value)} />
        </label>
        <label>
          E-mail
          <input type="text" value={profile.email} onChange={(e) => update('email', e.target.value)} />
        </label>
        <label>
          Telefone
          <input
            type="text"
            value={profile.telefone}
            onChange={(e) => update('telefone', e.target.value)}
          />
        </label>
        <label>
          Data de nascimento
          <input
            type="date"
            value={profile.nascimento}
            onChange={(e) => update('nascimento', e.target.value)}
          />
        </label>
        <label>
          Tipo sanguíneo
          <input
            type="text"
            value={profile.tipoSanguineo}
            onChange={(e) => update('tipoSanguineo', e.target.value)}
          />
        </label>
        <label>
          Contato de emergência
          <input
            type="text"
            value={profile.contatoEmergencia}
            onChange={(e) => update('contatoEmergencia', e.target.value)}
          />
        </label>

        <button className="btn-primary" onClick={save}>
          Salvar perfil
        </button>
      </div>

      <div className="card form-grid" style={{ marginTop: 12 }}>
        <h3 className="card-title">Conta (opcional)</h3>
        {auth ? (
          <>
            <p className="card-sub">
              Conectado como {auth.name ? `${auth.name} (${auth.email})` : auth.email}
              {auth.provider ? ` • ${auth.provider}` : ''}
            </p>
            {auth.picture && (
              <img
                src={auth.picture}
                alt="Avatar do Google"
                width={48}
                height={48}
                style={{ borderRadius: 999, border: '1px solid #cbd5e1' }}
              />
            )}
            <button className="btn-danger" onClick={signOut}>
              Sair
            </button>
          </>
        ) : (
          <>
            <label>
              Senha local
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            <button className="btn-primary" onClick={signIn}>
              Entrar
            </button>
            <label>
              Google Client ID
              <input
                type="text"
                value={googleClientId}
                onChange={(e) => setGoogleClientId(e.target.value)}
                placeholder="Cole aqui o Client ID do Google OAuth"
              />
            </label>
            <button
              className="btn-soft"
              onClick={() => {
                setGoogleRenderNonce((current) => current + 1);
                startGoogleSignIn();
              }}
              disabled={!googleReady}
            >
              {googleReady ? 'Entrar com Google (escolher conta)' : 'Carregando Google...'}
            </button>
            <div id="medapp-google-login-button" style={{ minHeight: 48 }} />
            {googleBusy && <p className="card-sub">Abrindo seletor de contas Google...</p>}
            {googleError && <p className="card-sub">{googleError}</p>}
          </>
        )}
      </div>

      <div className="card form-grid" style={{ marginTop: 12 }}>
        <h3 className="card-title">Acessibilidade</h3>
        <label>
          Tamanho da fonte
          <select
            value={settings.fontScale}
            onChange={(e) => setUiSettings({ ...settings, fontScale: Number(e.target.value) || 1 })}
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
            onChange={(e) => setUiSettings({ ...settings, highContrast: e.target.checked })}
          />
          Alto contraste
        </label>
      </div>
    </div>
  );
}

function CalendarPage() {
  const agenda = loadAgendaItems()
    .map((event) => ({ id: event.id, title: event.compromisso, date: event.data, subtitle: event.hora }))
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));

  return (
    <div>
      <h2 className="page-title">Calendário da Saúde</h2>
      {agenda.length === 0 && <p className="empty">Nenhum compromisso para exibir no calendário.</p>}
      <div className="med-list">
        {agenda.map((item) => (
          <article className="card" key={item.id}>
            <h3 className="card-title">{item.title}</h3>
            <p className="card-sub">
              {item.date} {item.subtitle ? `• ${item.subtitle}` : ''}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}

function ActivityLogPage() {
  const [logs, setLogs] = useState<Item[]>(() => readJson<Item[]>('medapp.activity.logs', []));
  const [text, setText] = useState('');

  function save(next: Item[]) {
    setLogs(next);
    writeJson('medapp.activity.logs', next);
  }

  function add() {
    if (!text.trim()) return;
    save([{ id: createId(), title: text.trim(), date: new Date().toISOString() }, ...logs]);
    setText('');
    trackEvent('manual_log_added', 'Registro manual adicionado ao histórico');
  }

  return (
    <div>
      <h2 className="page-title">Histórico de Atividades</h2>
      <div className="card form-grid">
        <label>
          Registrar atividade
          <input type="text" value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        <button className="btn-primary" onClick={add}>
          Adicionar registro
        </button>
      </div>

      <div className="med-list" style={{ marginTop: 12 }}>
        {logs.map((log) => (
          <article className="card" key={log.id}>
            <h3 className="card-title">{log.title}</h3>
            <p className="card-sub">{new Date(log.date ?? '').toLocaleString('pt-BR')}</p>
            <button className="btn-danger" onClick={() => save(logs.filter((i) => i.id !== log.id))}>
              Remover
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

function PrivacyPage() {
  const [privacy, setPrivacy] = useState<PrivacyData>(() =>
    readJson<PrivacyData>('medapp.privacy', {
      lockEnabled: false,
      analyticsEnabled: false,
      cloudBackup: false
    })
  );
  const [importText, setImportText] = useState('');

  function save(next: PrivacyData) {
    setPrivacy(next);
    writeJson('medapp.privacy', next);
  }

  function exportData() {
    const data = exportAllMedappData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'medapp-backup.json';
    link.click();
    URL.revokeObjectURL(url);
    trackEvent('backup_export', 'Backup exportado');
  }

  function importData() {
    try {
      const parsed = JSON.parse(importText) as Record<string, string>;
      importAllMedappData(parsed);
      window.alert('Dados importados com sucesso.');
      setImportText('');
      window.location.reload();
    } catch {
      window.alert('JSON inválido para importação.');
    }
  }

  function clearData() {
    if (!window.confirm('Isso apagará todos os dados locais do MedApp. Continuar?')) return;
    clearAllMedappData();
    window.location.reload();
  }

  return (
    <div>
      <h2 className="page-title">Privacidade e Segurança</h2>
      <div className="card form-grid">
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={privacy.lockEnabled}
            onChange={(e) => save({ ...privacy, lockEnabled: e.target.checked })}
          />
          Bloqueio de app (simulação)
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={privacy.analyticsEnabled}
            onChange={(e) => save({ ...privacy, analyticsEnabled: e.target.checked })}
          />
          Compartilhar dados anônimos de uso
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={privacy.cloudBackup}
            onChange={(e) => save({ ...privacy, cloudBackup: e.target.checked })}
          />
          Backup em nuvem (preferência)
        </label>

        <button className="btn-soft" onClick={exportData}>
          Exportar backup
        </button>

        <label>
          Importar backup (cole JSON)
          <textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={5} />
        </label>
        <button className="btn-primary" onClick={importData}>
          Importar dados
        </button>

        <button className="btn-danger" onClick={clearData}>
          Limpar todos os dados locais
        </button>
      </div>
    </div>
  );
}


export function DrawerPageRouter({ pageKey }: { pageKey: DrawerPageKey }) {
  if (pageKey === 'vacinas') {
    return (
      <CrudPage
        title="Vacinas"
        storageKey="medapp.vaccines"
        emptyText="Nenhuma vacina cadastrada."
        fields={[
          { key: 'title', label: 'Vacina' },
          { key: 'subtitle', label: 'Dose/Lote' },
          { key: 'date', label: 'Data de aplicação', type: 'date' },
          { key: 'details', label: 'Local/observações' }
        ]}
      />
    );
  }

  if (pageKey === 'diario') {
    return (
      <CrudPage
        title="Diário de Saúde"
        storageKey="medapp.diary"
        emptyText="Nenhuma anotação registrada."
        fields={[
          { key: 'title', label: 'Título' },
          { key: 'details', label: 'Como você está se sentindo?' },
          { key: 'date', label: 'Data', type: 'date' }
        ]}
      />
    );
  }

  if (pageKey === 'receitas') {
    return (
      <CrudPage
        title="Receitas Médicas"
        storageKey="medapp.prescriptions"
        emptyText="Nenhuma receita cadastrada."
        fields={[
          { key: 'title', label: 'Profissional/Clínica' },
          { key: 'subtitle', label: 'Descrição curta' },
          { key: 'date', label: 'Validade', type: 'date' },
          { key: 'details', label: 'Medicamentos e orientações' }
        ]}
      />
    );
  }

  if (pageKey === 'relatorios') return <ReportsPage />;
  if (pageKey === 'central_notificacoes') return <NotificationsCenterPage />;
  if (pageKey === 'perfil') return <ProfilePage />;
  if (pageKey === 'calendario') return <CalendarPage />;
  if (pageKey === 'historico') return <ActivityLogPage />;
  if (pageKey === 'privacidade') return <PrivacyPage />;

  return <div className="empty">Página não encontrada.</div>;
}
