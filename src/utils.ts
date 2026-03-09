import type {
  AnalyticsEvent,
  AppSettings,
  AuthState,
  MedicalAgendaItem,
  Medication,
  TodayDoseEntry
} from './types';

const MEDICATIONS_KEY = 'medapp.medications';
const AGENDA_ITEMS_KEY = 'medapp.agenda.items';
const AGENDA_LIST_EVENTS_KEY = 'medapp.agenda.list.events';
const AGENDA_DIARY_NOTES_KEY = 'medapp.agenda.diary.notes';
const SETTINGS_KEY = 'medapp.settings';
const ANALYTICS_KEY = 'medapp.analytics.events';
const AUTH_KEY = 'medapp.auth';
const SNOOZE_KEY = 'medapp.doses.snooze';
const SKIP_KEY = 'medapp.doses.skip';
const NOTIFIED_KEY = 'medapp.notifications.sent';

export function createId(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadMedications(): Medication[] {
  const parsed = parseJson<Medication[]>(localStorage.getItem(MEDICATIONS_KEY), []);
  return parsed.filter((m) => m.name && m.dosage && m.frequency > 0 && m.duration > 0 && m.time);
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

export function calculateTodayDoseTimes(firstDoseTime: string, frequencyHours: number): Date[] {
  const [hour, minute] = firstDoseTime.split(':').map((part) => Number(part) || 0);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
  const dosesPerDay = Math.max(1, Math.floor(24 / frequencyHours));

  return Array.from({ length: dosesPerDay }, (_, index) => {
    return new Date(start.getTime() + index * frequencyHours * 60 * 60 * 1000);
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
  return parseJson(localStorage.getItem(AGENDA_ITEMS_KEY), [] as MedicalAgendaItem[]);
}

export function saveAgendaItems(items: MedicalAgendaItem[]): void {
  localStorage.setItem(AGENDA_ITEMS_KEY, JSON.stringify(items));
}

export function loadStringArray(key: 'events' | 'notes'): string[] {
  const storageKey = key === 'events' ? AGENDA_LIST_EVENTS_KEY : AGENDA_DIARY_NOTES_KEY;
  return parseJson(localStorage.getItem(storageKey), [] as string[]);
}

export function saveStringArray(key: 'events' | 'notes', values: string[]): void {
  const storageKey = key === 'events' ? AGENDA_LIST_EVENTS_KEY : AGENDA_DIARY_NOTES_KEY;
  localStorage.setItem(storageKey, JSON.stringify(values));
}

export function loadSettings(): AppSettings {
  return parseJson<AppSettings>(localStorage.getItem(SETTINGS_KEY), {
    onboardingDone: false,
    requestNotifications: true,
    fontScale: 1,
    highContrast: false
  });
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadAuth(): AuthState | null {
  return parseJson<AuthState | null>(localStorage.getItem(AUTH_KEY), null);
}

export function saveAuth(auth: AuthState | null): void {
  if (!auth) {
    localStorage.removeItem(AUTH_KEY);
    return;
  }
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

export function trackEvent(type: string, message: string): void {
  const events = parseJson<AnalyticsEvent[]>(localStorage.getItem(ANALYTICS_KEY), []);
  const next: AnalyticsEvent = {
    id: createId(),
    type,
    message,
    createdAt: new Date().toISOString()
  };
  localStorage.setItem(ANALYTICS_KEY, JSON.stringify([next, ...events].slice(0, 300)));
}

export function loadAnalyticsEvents(): AnalyticsEvent[] {
  return parseJson<AnalyticsEvent[]>(localStorage.getItem(ANALYTICS_KEY), []);
}

function loadSnoozeMap(): Record<string, string> {
  return parseJson<Record<string, string>>(localStorage.getItem(SNOOZE_KEY), {});
}

function saveSnoozeMap(map: Record<string, string>): void {
  localStorage.setItem(SNOOZE_KEY, JSON.stringify(map));
}

function loadSkipMap(): Record<string, boolean> {
  return parseJson<Record<string, boolean>>(localStorage.getItem(SKIP_KEY), {});
}

function saveSkipMap(map: Record<string, boolean>): void {
  localStorage.setItem(SKIP_KEY, JSON.stringify(map));
}

function loadNotifiedMap(): Record<string, string> {
  return parseJson<Record<string, string>>(localStorage.getItem(NOTIFIED_KEY), {});
}

function saveNotifiedMap(map: Record<string, string>): void {
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify(map));
}

export function buildTodayDoseEntries(medications: Medication[]): TodayDoseEntry[] {
  const snooze = loadSnoozeMap();
  const skip = loadSkipMap();

  return medications
    .flatMap((med) =>
      calculateTodayDoseTimes(med.time, med.frequency).map((doseDate) => {
        const time = formatTime(doseDate);
        const key = `${med.id}|${time}`;
        return {
          key,
          medicationId: med.id,
          medicationName: med.name,
          dosage: med.dosage,
          time,
          dateTimeIso: doseDate.toISOString(),
          taken: med.dosesTakenStrings.includes(time),
          skipped: Boolean(skip[key]),
          snoozedUntil: snooze[key]
        } satisfies TodayDoseEntry;
      })
    )
    .sort((a, b) => a.dateTimeIso.localeCompare(b.dateTimeIso));
}

export function snoozeDose(doseKey: string, minutes = 10): void {
  const map = loadSnoozeMap();
  map[doseKey] = new Date(Date.now() + minutes * 60_000).toISOString();
  saveSnoozeMap(map);
  trackEvent('dose_snoozed', `Dose adiada: ${doseKey} por ${minutes} minutos`);
}

export function clearSnooze(doseKey: string): void {
  const map = loadSnoozeMap();
  delete map[doseKey];
  saveSnoozeMap(map);
}

export function skipDose(doseKey: string): void {
  const map = loadSkipMap();
  map[doseKey] = true;
  saveSkipMap(map);
  trackEvent('dose_skipped', `Dose ignorada: ${doseKey}`);
}

export function unskipDose(doseKey: string): void {
  const map = loadSkipMap();
  delete map[doseKey];
  saveSkipMap(map);
}

export function shouldNotifyDose(entry: TodayDoseEntry, now: Date): boolean {
  if (entry.taken || entry.skipped) return false;

  if (entry.snoozedUntil) {
    const until = new Date(entry.snoozedUntil);
    if (until > now) return false;
  }

  const target = new Date(entry.dateTimeIso);
  const diff = Math.abs(now.getTime() - target.getTime());
  return diff <= 60_000;
}

export function markDoseNotified(doseKey: string): void {
  const map = loadNotifiedMap();
  map[doseKey] = new Date().toISOString();
  saveNotifiedMap(map);
}

export function wasDoseNotified(doseKey: string): boolean {
  const map = loadNotifiedMap();
  return Boolean(map[doseKey]);
}

export function exportAllMedappData(): Record<string, string> {
  const all: Record<string, string> = {};
  for (const key of Object.keys(localStorage)) {
    if (!key.startsWith('medapp.')) continue;
    const value = localStorage.getItem(key);
    if (value !== null) all[key] = value;
  }
  return all;
}

export function importAllMedappData(data: Record<string, string>): void {
  Object.entries(data).forEach(([key, value]) => {
    if (!key.startsWith('medapp.')) return;
    localStorage.setItem(key, value);
  });
  trackEvent('data_import', 'Dados importados no aplicativo');
}

export function clearAllMedappData(): void {
  Object.keys(localStorage)
    .filter((key) => key.startsWith('medapp.'))
    .forEach((key) => localStorage.removeItem(key));
}
