import { useMemo, useState } from 'react';
import type { Medication } from '../types';
import { createMedicationId, formatTime } from '../utils';

interface MedicationFormModalProps {
  initialMedication?: Medication;
  onClose: () => void;
  onSave: (medication: Medication) => void;
  onDelete?: () => void;
}

export function MedicationFormModal({
  initialMedication,
  onClose,
  onSave,
  onDelete
}: MedicationFormModalProps) {
  const [name, setName] = useState(initialMedication?.name ?? '');
  const [dosage, setDosage] = useState(initialMedication?.dosage ?? '');
  const [frequency, setFrequency] = useState(String(initialMedication?.frequency ?? ''));
  const [duration, setDuration] = useState(String(initialMedication?.duration ?? '1'));
  const [startTime, setStartTime] = useState(
    initialMedication?.startTime ?? formatTime(new Date())
  );
  const [indefinite, setIndefinite] = useState((initialMedication?.duration ?? 1) === 0);
  const title = useMemo(
    () => (initialMedication ? 'Editar medicamento' : 'Novo medicamento'),
    [initialMedication]
  );

  function submit() {
    const freq = Number(frequency);
    const dur = indefinite ? 0 : Number(duration);

    if (!name.trim() || !dosage.trim() || !Number.isFinite(freq) || freq <= 0 || dur < 0) {
      window.alert('Preencha todos os campos corretamente');
      return;
    }

    onSave({
      id: initialMedication?.id ?? createMedicationId(),
      name: name.trim(),
      dosage: dosage.trim(),
      frequency: freq,
      duration: dur,
      startTime,
      taken: initialMedication?.taken ?? false
    });
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2 className="page-title">{title}</h2>
        <div className="form-grid">
          <label>
            Nome
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </label>

          <label>
            Dosagem
            <input type="text" value={dosage} onChange={(e) => setDosage(e.target.value)} />
          </label>

          <label>
            Frequência (h)
            <input
              type="number"
              min={1}
              step={1}
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
            />
          </label>

          {!indefinite && (
            <label>
              Duração (dias)
              <input
                type="number"
                min={0}
                step={1}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </label>
          )}

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={indefinite}
              onChange={(e) => {
                const isOn = e.target.checked;
                setIndefinite(isOn);
                if (isOn) setDuration('0');
                if (!isOn && duration === '0') setDuration('1');
              }}
            />
            Tratamento por tempo indefinido
          </label>

          <label>
            Horário inicial
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </label>
        </div>

        <div className="row" style={{ marginTop: 14 }}>
          {onDelete && (
            <button className="btn-danger" onClick={onDelete}>
              Excluir
            </button>
          )}
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
