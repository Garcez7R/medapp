import type { Medication } from './types';

export const STORAGE_KEY = 'medapp.medications';

export function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function parseTimeToToday(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h || 0, m || 0, 0, 0);
}

export function nextDoseDate(med: Medication, base = new Date()): Date {
  const start = parseTimeToToday(med.startTime);
  let next = new Date(start);

  while (next <= base) {
    next = new Date(next.getTime() + med.frequency * 60 * 60 * 1000);
  }

  return next;
}

export function saveMedications(meds: Medication[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(meds));
}

export function loadMedications(): Medication[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as Medication[];
    return parsed.filter((m) => m.name && m.dosage && m.frequency > 0);
  } catch {
    return [];
  }
}

export function createMedicationId(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}
