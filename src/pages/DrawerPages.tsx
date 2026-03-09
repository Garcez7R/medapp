import { useMemo, useState } from 'react';
import type { DrawerPageKey, MainTab } from '../nav';
import { createId, loadAgendaItems, loadMedications } from '../utils';

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

function useCrudState(storageKey: string) {
  const [items, setItems] = useState<Item[]>(() => readJson<Item[]>(storageKey, []));

  const save = (next: Item[]) => {
    setItems(next);
    writeJson(storageKey, next);
  };

  const add = (item: Omit<Item, 'id'>) => save([{ id: createId(), ...item }, ...items]);
  const remove = (id: string) => save(items.filter((i) => i.id !== id));

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
  const dosesTotal = meds.reduce((sum, med) => sum + Math.max(1, Math.floor(24 / med.frequency)) * med.duration, 0);
  const takenTotal = meds.reduce((sum, med) => sum + med.dosesTakenStrings.length, 0);

  const summary = `Medicações ativas: ${meds.length}\nCompromissos na agenda: ${agenda.length}\nDoses previstas: ${dosesTotal}\nDoses marcadas como tomadas: ${takenTotal}`;

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

  function save() {
    writeJson('medapp.profile', profile);
    window.alert('Perfil salvo com sucesso.');
  }

  function update<K extends keyof ProfileData>(key: K, value: ProfileData[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
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
    const data: Record<string, string> = {};
    Object.keys(localStorage)
      .filter((key) => key.startsWith('medapp.'))
      .forEach((key) => {
        const value = localStorage.getItem(key);
        if (value != null) data[key] = value;
      });

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'medapp-backup.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  function importData() {
    try {
      const parsed = JSON.parse(importText) as Record<string, string>;
      Object.entries(parsed).forEach(([key, value]) => {
        if (key.startsWith('medapp.')) localStorage.setItem(key, value);
      });
      window.alert('Dados importados com sucesso.');
      setImportText('');
    } catch {
      window.alert('JSON inválido para importação.');
    }
  }

  function clearData() {
    if (!window.confirm('Isso apagará todos os dados locais do MedApp. Continuar?')) return;
    Object.keys(localStorage)
      .filter((key) => key.startsWith('medapp.'))
      .forEach((key) => localStorage.removeItem(key));
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

function AssistantPage() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('Pergunte algo sobre sua rotina de saúde.');

  function ask() {
    const q = question.trim().toLowerCase();
    if (!q) return;

    const meds = loadMedications();
    const agenda = loadAgendaItems();

    if (q.includes('medic')) {
      setAnswer(`Você tem ${meds.length} medicações cadastradas.`);
    } else if (q.includes('agenda') || q.includes('consulta')) {
      setAnswer(`Você tem ${agenda.length} compromissos cadastrados na agenda médica.`);
    } else if (q.includes('dica') || q.includes('melhor')) {
      setAnswer('Mantenha horários consistentes, use lembretes e revise sua agenda semanalmente.');
    } else {
      setAnswer('Posso ajudar com medicações, agenda, lembretes e organização da rotina.');
    }
  }

  return (
    <div>
      <h2 className="page-title">Assistente de Saúde</h2>
      <div className="card form-grid">
        <label>
          Sua pergunta
          <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)} />
        </label>
        <button className="btn-primary" onClick={ask}>
          Perguntar
        </button>
        <p className="card-sub">{answer}</p>
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
  if (pageKey === 'assistente') return <AssistantPage />;

  return <div className="empty">Página não encontrada.</div>;
}
