import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import type { MedicalAgendaItem } from '../types';
import { createId, loadAgendaItems, saveAgendaItems } from '../utils';

const defaultItem = (): MedicalAgendaItem => ({
  id: createId(),
  compromisso: '',
  medico: '',
  contato: '',
  especialidade: '',
  data: new Date().toISOString().slice(0, 10),
  hora: '',
  local: '',
  observacoes: '',
  lembrete: 'Sem lembrete'
});

const reminders = ['Sem lembrete', '30 min antes', '1 hora antes', '3 horas antes', '1 dia antes'];
const INDEFINITE_OCCURRENCES_PREVIEW = 24;

function addDaysToIsoDate(dateIso: string, days: number): string {
  const [year, month, day] = dateIso.split('-').map((part) => Number(part) || 0);
  const base = new Date(year, Math.max(0, month - 1), day);
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
}

export function AgendaPage() {
  const [items, setItems] = useState<MedicalAgendaItem[]>(() => loadAgendaItems());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    saveAgendaItems(items);
  }, [items]);

  const editingItem = useMemo(() => items.find((item) => item.id === editingId), [editingId, items]);

  function saveItem(newItems: MedicalAgendaItem[]) {
    setItems((prev) => {
      if (newItems.length === 1) {
        const [newItem] = newItems;
        const idx = prev.findIndex((item) => item.id === newItem.id);
        if (idx === -1) return [...prev, newItem];
        return prev.map((item) => (item.id === newItem.id ? newItem : item));
      }
      return [...prev, ...newItems];
    });
    setCreating(false);
    setEditingId(null);
  }

  function removeItem(id: string) {
    if (!window.confirm('Deseja realmente excluir este compromisso?')) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  return (
    <div>
      <h2 className="page-title">Agenda Médica</h2>
      <p className="card-sub" style={{ marginTop: -4 }}>
        Recorrência disponível no botão +: selecione <strong>A cada X dias</strong>.
      </p>

      {items.length === 0 && <p className="empty">Nenhum compromisso.</p>}

      <div className="med-list">
        {items.map((item) => (
          <article className="card" key={item.id}>
            <h3 className="card-title">{item.compromisso}</h3>
            <p className="card-sub">
              Data: {item.data}
              <br />
              Hora: {item.hora || '-'}
              <br />
              Local: {item.local || '-'}
              <br />
              Profissional: {item.medico || '-'} ({item.especialidade || '-'})
              <br />
              Contato: {item.contato || '-'}
              <br />
              Obs: {item.observacoes || '-'}
              <br />
              Lembrete: {item.lembrete}
              {item.recorrenciaAtiva && item.recorrenciaDias ? (
                <>
                  <br />
                  {item.recorrenciaIndefinida
                    ? `Recorrência: a cada ${item.recorrenciaDias} dia(s) (indefinida, próximas ${INDEFINITE_OCCURRENCES_PREVIEW} datas)`
                    : `Recorrência: a cada ${item.recorrenciaDias} dia(s)${
                        item.recorrenciaTotal && item.recorrenciaIndice
                          ? ` (${item.recorrenciaIndice}/${item.recorrenciaTotal})`
                          : ''
                      }`}
                </>
              ) : null}
            </p>
            <div className="row">
              <button className="btn-soft" onClick={() => setEditingId(item.id)}>
                Editar
              </button>
              <button className="btn-danger" onClick={() => removeItem(item.id)}>
                Excluir
              </button>
            </div>
          </article>
        ))}
      </div>

      <button className="fab btn-primary" onClick={() => setCreating(true)} aria-label="Adicionar compromisso">
        <Plus size={24} aria-hidden="true" />
      </button>

      {creating && <AgendaItemModal onClose={() => setCreating(false)} onSave={saveItem} />}
      {editingItem && (
        <AgendaItemModal
          initialItem={editingItem}
          onClose={() => setEditingId(null)}
          onSave={saveItem}
        />
      )}
    </div>
  );
}

interface AgendaItemModalProps {
  initialItem?: MedicalAgendaItem;
  onClose: () => void;
  onSave: (items: MedicalAgendaItem[]) => void;
}

function AgendaItemModal({ initialItem, onClose, onSave }: AgendaItemModalProps) {
  const [form, setForm] = useState<MedicalAgendaItem>(initialItem ?? defaultItem());
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [repeatEveryDays, setRepeatEveryDays] = useState(14);
  const [repeatOccurrences, setRepeatOccurrences] = useState(6);
  const [repeatMode, setRepeatMode] = useState<'quantidade' | 'indefinida'>('quantidade');

  function setField<K extends keyof MedicalAgendaItem>(field: K, value: MedicalAgendaItem[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function submit() {
    if (!form.compromisso.trim() || !form.data) {
      window.alert('Por favor, preencha os campos obrigatórios.');
      return;
    }

    const baseItem: MedicalAgendaItem = {
      ...form,
      compromisso: form.compromisso.trim()
    };

    if (!initialItem && repeatEnabled) {
      const everyDays = Math.max(1, Math.floor(repeatEveryDays));
      const isIndefinite = repeatMode === 'indefinida';
      const occurrences = isIndefinite
        ? INDEFINITE_OCCURRENCES_PREVIEW
        : Math.max(1, Math.floor(repeatOccurrences));
      const nextItems: MedicalAgendaItem[] = Array.from({ length: occurrences }, (_, index) => ({
        ...baseItem,
        id: createId(),
        data: addDaysToIsoDate(baseItem.data, index * everyDays),
        recorrenciaAtiva: true,
        recorrenciaDias: everyDays,
        recorrenciaTotal: isIndefinite ? undefined : occurrences,
        recorrenciaIndice: index + 1,
        recorrenciaIndefinida: isIndefinite
      }));
      onSave(nextItems);
      return;
    }

    onSave([{ ...baseItem, recorrenciaAtiva: false }]);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="page-title">{initialItem ? 'Editar compromisso' : 'Novo compromisso'}</h2>

        <div className="form-grid">
          <label>
            Compromisso *
            <input
              type="text"
              value={form.compromisso}
              onChange={(e) => setField('compromisso', e.target.value)}
            />
          </label>

          <label>
            Profissional
            <input type="text" value={form.medico} onChange={(e) => setField('medico', e.target.value)} />
          </label>

          <label>
            Contato
            <input
              type="text"
              value={form.contato}
              onChange={(e) => setField('contato', e.target.value)}
            />
          </label>

          <label>
            Especialidade
            <input
              type="text"
              value={form.especialidade}
              onChange={(e) => setField('especialidade', e.target.value)}
            />
          </label>

          <label>
            Data *
            <input type="date" value={form.data} onChange={(e) => setField('data', e.target.value)} />
          </label>

          {!initialItem && (
            <>
              <label>
                Recorrência
                <select
                  value={repeatEnabled ? 'dias' : 'nenhuma'}
                  onChange={(e) => setRepeatEnabled(e.target.value === 'dias')}
                >
                  <option value="nenhuma">Sem recorrência</option>
                  <option value="dias">A cada X dias</option>
                </select>
              </label>

              {repeatEnabled && (
                <>
                  <label>
                    Duração da recorrência
                    <select
                      value={repeatMode}
                      onChange={(e) =>
                        setRepeatMode(
                          (e.target.value as 'quantidade' | 'indefinida') === 'indefinida'
                            ? 'indefinida'
                            : 'quantidade'
                        )
                      }
                    >
                      <option value="quantidade">Número de ocorrências</option>
                      <option value="indefinida">Indefinida (crônico)</option>
                    </select>
                  </label>

                  <label>
                    Repetir a cada quantos dias
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={repeatEveryDays}
                      onChange={(e) => setRepeatEveryDays(Number(e.target.value) || 1)}
                    />
                  </label>

                  {repeatMode === 'quantidade' ? (
                    <label>
                      Quantidade de ocorrências
                      <input
                        type="number"
                        min={2}
                        max={60}
                        value={repeatOccurrences}
                        onChange={(e) => setRepeatOccurrences(Number(e.target.value) || 2)}
                      />
                    </label>
                  ) : (
                    <p className="card-sub" style={{ marginTop: 0 }}>
                      Recorrência crônica ativa: serão criadas as próximas {INDEFINITE_OCCURRENCES_PREVIEW} datas.
                    </p>
                  )}
                </>
              )}
            </>
          )}

          <label>
            Horário
            <input type="time" value={form.hora} onChange={(e) => setField('hora', e.target.value)} />
          </label>

          <label>
            Local
            <input type="text" value={form.local} onChange={(e) => setField('local', e.target.value)} />
          </label>

          <label>
            Observações
            <input
              type="text"
              value={form.observacoes}
              onChange={(e) => setField('observacoes', e.target.value)}
            />
          </label>

          <label>
            Lembrete
            <select value={form.lembrete} onChange={(e) => setField('lembrete', e.target.value)}>
              {reminders.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn-soft" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={submit}>
            Salvar
          </button>
        </div>
      </section>
    </div>
  );
}
