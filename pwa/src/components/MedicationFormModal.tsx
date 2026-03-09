import { useMemo, useState } from 'react';
import type { Medication } from '../types';
import { createId, formatTime } from '../utils';

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
  const [frequency, setFrequency] = useState(String(initialMedication?.frequency ?? 8));
  const [duration, setDuration] = useState(String(initialMedication?.duration ?? 7));
  const [time, setTime] = useState(initialMedication?.time ?? formatTime(new Date()));

  const title = useMemo(
    () => (initialMedication ? 'Editar medicamento' : 'Novo medicamento'),
    [initialMedication]
  );

  function submit() {
    const frequencyHours = Number(frequency);
    const durationDays = Number(duration);

    if (
      !name.trim() ||
      !dosage.trim() ||
      !Number.isFinite(frequencyHours) ||
      frequencyHours <= 0 ||
      !Number.isFinite(durationDays) ||
      durationDays <= 0 ||
      !time
    ) {
      window.alert('Preencha todos os campos corretamente');
      return;
    }

    onSave({
      id: initialMedication?.id ?? createId(),
      name: name.trim(),
      dosage: dosage.trim(),
      frequency: frequencyHours,
      duration: durationDays,
      time,
      dosesTakenStrings: initialMedication?.dosesTakenStrings ?? []
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

          <label>
            Duração (dias)
            <input
              type="number"
              min={1}
              step={1}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </label>

          <label>
            Início
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
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
