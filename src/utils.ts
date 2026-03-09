import type { MedicalAgendaItem, Medication } from './types';

const MEDICATIONS_KEY = 'medapp.medications';
const AGENDA_ITEMS_KEY = 'medapp.agenda.items';
const AGENDA_LIST_EVENTS_KEY = 'medapp.agenda.list.events';
const AGENDA_DIARY_NOTES_KEY = 'medapp.agenda.diary.notes';

export function createId(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

export function loadMedications(): Medication[] {
  const raw = localStorage.getItem(MEDICATIONS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Medication[];
    return parsed.filter((m) => m.name && m.dosage && m.frequency > 0 && m.duration > 0 && m.time);
  } catch {
    return [];
  }
}

export function saveMedications(medications: Medication[]): void {
  localStorage.setItem(MEDICATIONS_KEY, JSON.stringify(medications));
}

export function calculateDoseTimes(firstDoseTime: string, frequencyHours: number, durationDays: number): Date[] {
  const [hour, minute] = firstDoseTime.split(':').map((part) => Number(part) || 0);
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
  const dosesPerDay = Math.max(1, Math.floor(24 / frequencyHours));
  const totalDoses = dosesPerDay * Math.max(1, durationDays);

  return Array.from({ length: totalDoses }, (_, index) => {
    return new Date(base.getTime() + index * frequencyHours * 60 * 60 * 1000);
  });
}

export function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function capitalize(text: string): string {
  if (!text) return text;
  return text[0].toUpperCase() + text.slice(1);
}

export function loadAgendaItems(): MedicalAgendaItem[] {
  const raw = localStorage.getItem(AGENDA_ITEMS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as MedicalAgendaItem[];
  } catch {
    return [];
  }
}

export function saveAgendaItems(items: MedicalAgendaItem[]): void {
  localStorage.setItem(AGENDA_ITEMS_KEY, JSON.stringify(items));
}

export function loadStringArray(key: 'events' | 'notes'): string[] {
  const storageKey = key === 'events' ? AGENDA_LIST_EVENTS_KEY : AGENDA_DIARY_NOTES_KEY;
  const raw = localStorage.getItem(storageKey);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export function saveStringArray(key: 'events' | 'notes', values: string[]): void {
  const storageKey = key === 'events' ? AGENDA_LIST_EVENTS_KEY : AGENDA_DIARY_NOTES_KEY;
  localStorage.setItem(storageKey, JSON.stringify(values));
}
