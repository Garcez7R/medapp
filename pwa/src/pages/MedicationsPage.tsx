import { useEffect, useMemo, useState } from 'react';
import { MedicationFormModal } from '../components/MedicationFormModal';
import type { Medication } from '../types';
import { loadMedications, nextDoseDate, saveMedications } from '../utils';

export function MedicationsPage() {
  const [medications, setMedications] = useState<Medication[]>(() => loadMedications());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    saveMedications(medications);
  }, [medications]);

  useEffect(() => {
    let interval: number | null = null;
    const sent = new Set<string>();

    const notifyDueMedications = async () => {
      if (!('Notification' in window)) return;
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      if (Notification.permission !== 'granted') return;

      const now = new Date();
      for (const med of medications) {
        const next = nextDoseDate(med, new Date(now.getTime() - 60_000));
        const diff = next.getTime() - now.getTime();

        if (diff >= 0 && diff < 60_000) {
          const key = `${med.id}-${next.toISOString()}`;
          if (sent.has(key)) continue;

          sent.add(key);
          new Notification('Hora do medicamento', {
            body: `${med.name} - ${med.dosage}`
          });
        }
      }
    };

    notifyDueMedications();
    interval = window.setInterval(notifyDueMedications, 60_000);

    return () => {
      if (interval !== null) window.clearInterval(interval);
    };
  }, [medications]);

  const editingMedication = useMemo(
    () => medications.find((med) => med.id === editingId),
    [editingId, medications]
  );

  function upsertMedication(nextMed: Medication) {
    setMedications((prev) => {
      const index = prev.findIndex((med) => med.id === nextMed.id);
      if (index === -1) return [...prev, nextMed];
      return prev.map((med) => (med.id === nextMed.id ? nextMed : med));
    });
    setIsCreating(false);
    setEditingId(null);
  }

  function removeMedication(id: string) {
    if (!window.confirm('Deseja realmente excluir este medicamento?')) return;
    setMedications((prev) => prev.filter((med) => med.id !== id));
    setEditingId(null);
  }

  function toggleTaken(id: string) {
    setMedications((prev) =>
      prev.map((med) => (med.id === id ? { ...med, taken: !med.taken } : med))
    );
  }

  return (
    <div>
      <h2 className="page-title">Medicações/Dosagem</h2>

      {medications.length === 0 && (
        <p className="empty">Nenhuma medicação cadastrada. Toque em + para adicionar.</p>
      )}

      <div className="med-list">
        {medications.map((med) => {
          const next = nextDoseDate(med);
          const nextLabel = `${String(next.getHours()).padStart(2, '0')}:${String(
            next.getMinutes()
          ).padStart(2, '0')}`;

          return (
            <article className="card" key={med.id}>
              <div className="card-head">
                <h3 className="card-title">
                  {med.name} ({med.dosage})
                </h3>
                <button className="btn-soft" onClick={() => setEditingId(med.id)}>
                  Editar
                </button>
              </div>

              <p className="card-sub">Próxima dose: {nextLabel}</p>

              <div className="row">
                <button
                  className={med.taken ? 'btn-taken' : 'btn-soft'}
                  onClick={() => toggleTaken(med.id)}
                >
                  {med.taken ? 'Tomado' : 'Marcar como tomado'}
                </button>
              </div>
            </article>
          );
        })}
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
    </div>
  );
}
