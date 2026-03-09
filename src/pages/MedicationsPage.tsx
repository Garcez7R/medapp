import { useEffect, useMemo, useState } from 'react';
import { MedicationFormModal } from '../components/MedicationFormModal';
import type { Medication } from '../types';
import { calculateDoseTimes, capitalize, formatTime, loadMedications, saveMedications } from '../utils';

export function MedicationsPage() {
  const [medications, setMedications] = useState<Medication[]>(() => loadMedications());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [dosesModalForId, setDosesModalForId] = useState<string | null>(null);

  useEffect(() => {
    saveMedications(medications);
  }, [medications]);

  const editingMedication = useMemo(
    () => medications.find((med) => med.id === editingId),
    [editingId, medications]
  );

  const doseMedication = useMemo(
    () => medications.find((med) => med.id === dosesModalForId),
    [dosesModalForId, medications]
  );

  function upsertMedication(nextMed: Medication) {
    setMedications((prev) => {
      const idx = prev.findIndex((m) => m.id === nextMed.id);
      if (idx === -1) return [...prev, nextMed];
      return prev.map((m) => (m.id === nextMed.id ? nextMed : m));
    });
    setEditingId(null);
    setIsCreating(false);
  }

  function removeMedication(id: string) {
    if (!window.confirm('Deseja realmente excluir este medicamento?')) return;
    setMedications((prev) => prev.filter((m) => m.id !== id));
    setEditingId(null);
    setDosesModalForId((current) => (current === id ? null : current));
  }

  function toggleDose(medication: Medication, dose: Date) {
    const doseStr = formatTime(dose);
    setMedications((prev) =>
      prev.map((m) => {
        if (m.id !== medication.id) return m;
        const exists = m.dosesTakenStrings.includes(doseStr);
        return {
          ...m,
          dosesTakenStrings: exists
            ? m.dosesTakenStrings.filter((value) => value !== doseStr)
            : [...m.dosesTakenStrings, doseStr]
        };
      })
    );
  }

  return (
    <div>
      <h2 className="page-title">Medicamentos/Dosagens</h2>

      {medications.length === 0 && <p className="empty">Nenhum medicamento cadastrado.</p>}

      <div className="med-list">
        {medications.map((med) => (
          <article className="card" key={med.id}>
            <div className="card-head">
              <h3 className="card-title">{capitalize(med.name)}</h3>
              <div className="row">
                <button className="btn-soft" onClick={() => setEditingId(med.id)}>
                  Editar
                </button>
                <button className="btn-danger" onClick={() => removeMedication(med.id)}>
                  Excluir
                </button>
              </div>
            </div>

            <p className="card-sub">
              Dosagem: {med.dosage}
              <br />
              Frequência: a cada {med.frequency}h | Duração: {med.duration} dias
              <br />
              Início: {med.time}
            </p>

            <button className="btn-soft" onClick={() => setDosesModalForId(med.id)}>
              Ver doses
            </button>
          </article>
        ))}
      </div>

      <button className="fab btn-primary" onClick={() => setIsCreating(true)} aria-label="Adicionar">
        +
      </button>

      {isCreating && (
        <MedicationFormModal onClose={() => setIsCreating(false)} onSave={upsertMedication} />
      )}

      {editingMedication && (
        <MedicationFormModal
          initialMedication={editingMedication}
          onClose={() => setEditingId(null)}
          onSave={upsertMedication}
          onDelete={() => removeMedication(editingMedication.id)}
        />
      )}

      {doseMedication && (
        <div className="modal-backdrop" onClick={() => setDosesModalForId(null)}>
          <section className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="page-title">
              {capitalize(doseMedication.name)} ({doseMedication.dosage})
            </h2>
            <p className="card-sub">Toque na bolinha para marcar como tomada</p>

            <div className="doses-list">
              {calculateDoseTimes(doseMedication.time, doseMedication.frequency, doseMedication.duration).map(
                (dose, index) => {
                  const doseStr = formatTime(dose);
                  const isTaken = doseMedication.dosesTakenStrings.includes(doseStr);

                  return (
                    <div key={`${doseMedication.id}-${index}`} className={`dose-row ${isTaken ? 'taken' : 'pending'}`}>
                      <span>{doseStr}</span>
                      <button className="btn-soft" onClick={() => toggleDose(doseMedication, dose)}>
                        {isTaken ? '✔' : '○'}
                      </button>
                    </div>
                  );
                }
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
