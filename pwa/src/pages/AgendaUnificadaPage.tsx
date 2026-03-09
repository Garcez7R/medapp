import { useMemo, useState } from 'react';
import { loadStringArray, saveStringArray } from '../utils';

type AgendaTab = 'lista' | 'calendario' | 'diario';

const calendarData: Record<string, string[]> = {
  '2025-07-15': ['Consulta com Dr. Silva às 15h'],
  '2025-07-20': ['Exame de sangue', 'Retorno de exame']
};

export function AgendaUnificadaPage() {
  const [tab, setTab] = useState<AgendaTab>('lista');
  const [eventos, setEventos] = useState<string[]>(() => loadStringArray('events'));
  const [notas, setNotas] = useState<string[]>(() => loadStringArray('notes'));
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  const eventosDoDia = useMemo(() => calendarData[selectedDate] ?? [], [selectedDate]);

  function addEvento() {
    const value = window.prompt('Descrição do evento');
    if (!value || !value.trim()) return;
    const next = [...eventos, value.trim()];
    setEventos(next);
    saveStringArray('events', next);
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
          {eventos.length === 0 ? (
            <p className="empty">📋 Nenhum evento registrado. Toque em + para adicionar.</p>
          ) : (
            <div className="med-list">
              {eventos.map((evento, index) => (
                <article className="card" key={`${evento}-${index}`}>
                  <p>{evento}</p>
                </article>
              ))}
            </div>
          )}
          <button className="fab btn-primary" onClick={addEvento} aria-label="Adicionar evento">
            +
          </button>
        </div>
      )}

      {tab === 'calendario' && (
        <div className="card">
          <label>
            Selecione uma data
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          </label>
          <div style={{ marginTop: 12 }}>
            {eventosDoDia.length === 0 && <p>Nenhum evento para esta data</p>}
            {eventosDoDia.map((evento) => (
              <p key={evento}>• {evento}</p>
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
