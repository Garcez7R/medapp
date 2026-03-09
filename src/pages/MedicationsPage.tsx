import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { MedicationFormModal } from '../components/MedicationFormModal';
import type { Medication } from '../types';
import {
  buildTodayDoseEntries,
  calculateDoseTimes,
  capitalize,
  clearSnooze,
  formatTime,
  loadMedications,
  markDoseNotified,
  saveMedications,
  shouldNotifyDose,
  skipDose,
  snoozeDose,
  trackEvent,
  unskipDose,
  wasDoseNotified
} from '../utils';

type TimelineFilter = 'all' | 'overdue' | 'upcoming' | 'taken';

export function MedicationsPage() {
  const [medications, setMedications] = useState<Medication[]>(() => loadMedications());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [dosesModalForId, setDosesModalForId] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>('all');

  useEffect(() => {
    saveMedications(medications);
  }, [medications]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const editingMedication = useMemo(
    () => medications.find((med) => med.id === editingId),
    [editingId, medications]
  );

  const doseMedication = useMemo(
    () => medications.find((med) => med.id === dosesModalForId),
    [dosesModalForId, medications]
  );

  const todayEntries = useMemo(() => buildTodayDoseEntries(medications), [medications, now]);

  const filteredTimeline = useMemo(() => {
    return todayEntries.filter((entry) => {
      const when = new Date(entry.dateTimeIso);
      const isOverdue = when < now && !entry.taken && !entry.skipped;
      const isUpcoming = when >= now && !entry.taken && !entry.skipped;

      if (timelineFilter === 'overdue') return isOverdue;
      if (timelineFilter === 'upcoming') return isUpcoming;
      if (timelineFilter === 'taken') return entry.taken;
      return true;
    });
  }, [todayEntries, now, timelineFilter]);

  useEffect(() => {
    const checkAndNotify = async () => {
      if (typeof Notification === 'undefined') return;
      if (Notification.permission === 'default') {
        try {
          await Notification.requestPermission();
        } catch {
          return;
        }
      }
      if (Notification.permission !== 'granted') return;

      const current = new Date();
      for (const entry of buildTodayDoseEntries(loadMedications())) {
        if (wasDoseNotified(entry.key)) continue;
        if (!shouldNotifyDose(entry, current)) continue;

        new Notification('Hora do medicamento', {
          body: `${capitalize(entry.medicationName)} - ${entry.dosage} (${entry.time})`
        });
        markDoseNotified(entry.key);
        trackEvent('notification_sent', `Notificação enviada para ${entry.medicationName} ${entry.time}`);
      }
    };

    checkAndNotify();
    const interval = window.setInterval(checkAndNotify, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  function upsertMedication(nextMed: Medication) {
    setMedications((prev) => {
      const idx = prev.findIndex((m) => m.id === nextMed.id);
      if (idx === -1) {
        trackEvent('medication_added', `Medicação adicionada: ${nextMed.name}`);
        return [...prev, nextMed];
      }
      trackEvent('medication_updated', `Medicação atualizada: ${nextMed.name}`);
      return prev.map((m) => (m.id === nextMed.id ? nextMed : m));
    });
    setEditingId(null);
    setIsCreating(false);
  }

  function removeMedication(id: string) {
    if (!window.confirm('Deseja realmente excluir este medicamento?')) return;
    const med = medications.find((item) => item.id === id);
    if (med) trackEvent('medication_deleted', `Medicação removida: ${med.name}`);
    setMedications((prev) => prev.filter((m) => m.id !== id));
    setEditingId(null);
    setDosesModalForId((current) => (current === id ? null : current));
  }

  function toggleDose(medication: Medication, dose: Date) {
    const doseStr = formatTime(dose);
    const doseKey = `${medication.id}|${doseStr}`;

    setMedications((prev) =>
      prev.map((m) => {
        if (m.id !== medication.id) return m;
        const exists = m.dosesTakenStrings.includes(doseStr);
        trackEvent('dose_toggle', `${exists ? 'Desmarcou' : 'Marcou'} dose ${medication.name} ${doseStr}`);
        return {
          ...m,
          dosesTakenStrings: exists
            ? m.dosesTakenStrings.filter((value) => value !== doseStr)
            : [...m.dosesTakenStrings, doseStr]
        };
      })
    );

    clearSnooze(doseKey);
    unskipDose(doseKey);
    setNow(new Date());
  }

  function actionSnooze(entryKey: string) {
    snoozeDose(entryKey, 10);
    setNow(new Date());
  }

  function actionSkip(entryKey: string) {
    skipDose(entryKey);
    setNow(new Date());
  }

  function actionUndoSkip(entryKey: string) {
    unskipDose(entryKey);
    setNow(new Date());
  }

  return (
    <div>
      <h2 className="page-title">Medicamentos/Dosagens</h2>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-head">
          <h3 className="card-title">Hoje</h3>
          <div className="row">
            <button
              className={`btn-soft filter-chip filter-all ${timelineFilter === 'all' ? 'active-chip' : ''}`}
              onClick={() => setTimelineFilter('all')}
            >
              Todas
            </button>
            <button
              className={`btn-soft filter-chip filter-overdue ${timelineFilter === 'overdue' ? 'active-chip' : ''}`}
              onClick={() => setTimelineFilter('overdue')}
            >
              Atrasadas
            </button>
            <button
              className={`btn-soft filter-chip filter-upcoming ${timelineFilter === 'upcoming' ? 'active-chip' : ''}`}
              onClick={() => setTimelineFilter('upcoming')}
            >
              Próximas
            </button>
            <button
              className={`btn-soft filter-chip filter-taken ${timelineFilter === 'taken' ? 'active-chip' : ''}`}
              onClick={() => setTimelineFilter('taken')}
            >
              Tomadas
            </button>
          </div>
        </div>

        {filteredTimeline.length === 0 && <p className="card-sub">Sem doses para o filtro selecionado.</p>}

        <div className="doses-list">
          {filteredTimeline.map((entry) => {
            const when = new Date(entry.dateTimeIso);
            const overdue = when < now && !entry.taken && !entry.skipped;
            return (
              <div className={`dose-row ${entry.taken ? 'taken' : overdue ? 'pending' : ''}`} key={entry.key}>
                <div>
                  <strong>{capitalize(entry.medicationName)}</strong>
                  <div className="card-sub" style={{ margin: 0 }}>
                    {entry.dosage} • {entry.time}
                    {entry.skipped ? ' • Ignorada' : ''}
                    {entry.snoozedUntil ? ` • Adiada até ${new Date(entry.snoozedUntil).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}
                  </div>
                </div>
                <div className="row">
                  <button
                    className={entry.taken ? 'btn-dose-undo' : 'btn-dose-take'}
                    onClick={() => {
                      const med = medications.find((item) => item.id === entry.medicationId);
                      if (!med) return;
                      toggleDose(med, new Date(entry.dateTimeIso));
                    }}
                  >
                    {entry.taken ? 'Desfazer' : 'Tomar'}
                  </button>
                  {!entry.taken && !entry.skipped && (
                    <>
                      <button className="btn-dose-snooze" onClick={() => actionSnooze(entry.key)}>
                        Adiar 10m
                      </button>
                      <button className="btn-dose-skip" onClick={() => actionSkip(entry.key)}>
                        Pular
                      </button>
                    </>
                  )}
                  {entry.skipped && (
                    <button className="btn-dose-undo" onClick={() => actionUndoSkip(entry.key)}>
                      Desfazer pulo
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
        <Plus size={24} aria-hidden="true" />
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
                      <button className={isTaken ? 'btn-dose-undo' : 'btn-dose-take'} onClick={() => toggleDose(doseMedication, dose)}>
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
