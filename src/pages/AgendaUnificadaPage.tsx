import { useMemo, useState } from 'react';
import { createId, loadAgendaItems, loadStringArray, saveStringArray } from '../utils';

type AgendaTab = 'lista' | 'calendario' | 'diario';

type AgendaListEntry = {
  id: string;
  text: string;
  date: string;
};

const AGENDA_LIST_KEY = 'medapp.agenda.list.entries';

function loadAgendaListEntries(): AgendaListEntry[] {
  const raw = localStorage.getItem(AGENDA_LIST_KEY);
  if (!raw) {
    // Migration path from old string-only list.
    const legacy = loadStringArray('events');
    if (!legacy.length) return [];
    const today = new Date().toISOString().slice(0, 10);
    const migrated = legacy.map((text) => ({ id: createId(), text, date: today }));
    localStorage.setItem(AGENDA_LIST_KEY, JSON.stringify(migrated));
    return migrated;
  }
  try {
    const parsed = JSON.parse(raw) as AgendaListEntry[];
    return parsed.filter((item) => item.id && item.text && item.date);
  } catch {
    return [];
  }
}

function saveAgendaListEntries(entries: AgendaListEntry[]) {
  localStorage.setItem(AGENDA_LIST_KEY, JSON.stringify(entries));
}

export function AgendaUnificadaPage() {
  const [tab, setTab] = useState<AgendaTab>('lista');
  const [eventos, setEventos] = useState<AgendaListEntry[]>(() => loadAgendaListEntries());
  const [notas, setNotas] = useState<string[]>(() => loadStringArray('notes'));
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [newEventText, setNewEventText] = useState('');
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().slice(0, 10));
  const [quickCalendarEvent, setQuickCalendarEvent] = useState('');

  const agendaMedicaItems = useMemo(
    () => loadAgendaItems().sort((a, b) => `${a.data} ${a.hora}`.localeCompare(`${b.data} ${b.hora}`)),
    [eventos, notas]
  );

  const eventosDoDiaLista = useMemo(
    () => eventos.filter((entry) => entry.date === selectedDate),
    [eventos, selectedDate]
  );

  const eventosDoDiaAgendaMedica = useMemo(
    () => agendaMedicaItems.filter((entry) => entry.data === selectedDate),
    [agendaMedicaItems, selectedDate]
  );

  function addEvento() {
    const value = newEventText.trim();
    if (!value) return;
    const date = newEventDate || new Date().toISOString().slice(0, 10);
    const next = [{ id: createId(), text: value, date }, ...eventos];
    setEventos(next);
    saveAgendaListEntries(next);
    setNewEventText('');
  }

  function addEventoFromCalendar() {
    const value = quickCalendarEvent.trim();
    if (!value) return;
    const next = [{ id: createId(), text: value, date: selectedDate }, ...eventos];
    setEventos(next);
    saveAgendaListEntries(next);
    setQuickCalendarEvent('');
    setTab('lista');
  }

  function removeEvento(id: string) {
    const next = eventos.filter((entry) => entry.id !== id);
    setEventos(next);
    saveAgendaListEntries(next);
  }

  function addNota() {
    const value = window.prompt('Escreva sua nota aqui');
    if (!value || !value.trim()) return;
    const next = [...notas, value.trim()];
    setNotas(next);
    saveStringArray('notes', next);
  }

  return (
    <div>
      <h2 className="page-title">Agenda da Saúde</h2>
      <div className="card" style={{ marginBottom: 12 }}>
        <p className="card-sub" style={{ marginTop: 0 }}>
          Resumo rápido
        </p>
        <p style={{ margin: 0 }}>
          Lista: <strong>{eventos.length}</strong> evento(s) • Compromissos médicos:{' '}
          <strong>{agendaMedicaItems.length}</strong> • Diário: <strong>{notas.length}</strong> nota(s)
        </p>
      </div>

      <div className="tabs-row">
        <button className={`tab-btn ${tab === 'lista' ? 'active' : ''}`} onClick={() => setTab('lista')}>
          Lista
        </button>
        <button
          className={`tab-btn ${tab === 'calendario' ? 'active' : ''}`}
          onClick={() => setTab('calendario')}
        >
          Calendário
        </button>
        <button className={`tab-btn ${tab === 'diario' ? 'active' : ''}`} onClick={() => setTab('diario')}>
          Diário
        </button>
      </div>

      {tab === 'lista' && (
        <div>
          <div className="card form-grid">
            <label>
              Novo evento
              <input
                type="text"
                value={newEventText}
                onChange={(e) => setNewEventText(e.target.value)}
                placeholder="Ex: Comprar medicação na farmácia"
              />
            </label>
            <label>
              Data
              <input type="date" value={newEventDate} onChange={(e) => setNewEventDate(e.target.value)} />
            </label>
            <button className="btn-primary" onClick={addEvento}>
              Adicionar evento
            </button>
          </div>

          {eventos.length === 0 ? (
            <p className="empty">📋 Nenhum evento registrado.</p>
          ) : (
            <div className="med-list" style={{ marginTop: 12 }}>
              {eventos.map((evento) => (
                <article className="card" key={evento.id}>
                  <p>{evento.text}</p>
                  <p className="card-sub">Data: {evento.date}</p>
                  <button className="btn-danger" onClick={() => removeEvento(evento.id)}>
                    Remover
                  </button>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'calendario' && (
        <div className="card">
          <label>
            Selecione uma data
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          </label>
          <div className="row" style={{ marginTop: 10 }}>
            <input
              type="text"
              value={quickCalendarEvent}
              onChange={(e) => setQuickCalendarEvent(e.target.value)}
              placeholder="Adicionar evento rápido nessa data"
              style={{ flex: 1 }}
            />
            <button className="btn-primary" onClick={addEventoFromCalendar}>
              Adicionar
            </button>
          </div>
          <div style={{ marginTop: 12 }}>
            <h3 className="card-title">Eventos da Lista</h3>
            {eventosDoDiaLista.length === 0 && <p className="card-sub">Nenhum evento da lista nesta data.</p>}
            {eventosDoDiaLista.map((evento) => (
              <p key={evento.id}>• {evento.text}</p>
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            <h3 className="card-title">Agenda Médica</h3>
            {eventosDoDiaAgendaMedica.length === 0 && <p className="card-sub">Nenhum compromisso médico nesta data.</p>}
            {eventosDoDiaAgendaMedica.map((evento) => (
              <p key={evento.id}>
                • {evento.compromisso}
                {evento.hora ? ` às ${evento.hora}` : ''}
              </p>
            ))}
          </div>
        </div>
      )}

      {tab === 'diario' && (
        <div>
          {notas.length === 0 ? (
            <p className="empty">📔 Nenhuma nota registrada. Toque em + para adicionar.</p>
          ) : (
            <div className="med-list">
              {notas.map((nota, index) => (
                <article className="card" key={`${nota}-${index}`}>
                  <p>{nota}</p>
                </article>
              ))}
            </div>
          )}
          <button className="fab btn-primary" onClick={addNota} aria-label="Adicionar nota">
            +
          </button>
        </div>
      )}
    </div>
  );
}
