import { useEffect, useMemo, useState } from 'react';
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

export function AgendaPage() {
  const [items, setItems] = useState<MedicalAgendaItem[]>(() => loadAgendaItems());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    saveAgendaItems(items);
  }, [items]);

  const editingItem = useMemo(() => items.find((item) => item.id === editingId), [editingId, items]);

  function saveItem(newItem: MedicalAgendaItem) {
    setItems((prev) => {
      const idx = prev.findIndex((item) => item.id === newItem.id);
      if (idx === -1) return [...prev, newItem];
      return prev.map((item) => (item.id === newItem.id ? newItem : item));
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
        +
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
  onSave: (item: MedicalAgendaItem) => void;
}

function AgendaItemModal({ initialItem, onClose, onSave }: AgendaItemModalProps) {
  const [form, setForm] = useState<MedicalAgendaItem>(initialItem ?? defaultItem());

  function setField<K extends keyof MedicalAgendaItem>(field: K, value: MedicalAgendaItem[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function submit() {
    if (!form.compromisso.trim() || !form.data) {
      window.alert('Por favor, preencha os campos obrigatórios.');
      return;
    }
    onSave({ ...form, compromisso: form.compromisso.trim() });
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
