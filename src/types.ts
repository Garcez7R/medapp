export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: number;
  duration: number;
  time: string;
  dosesTakenStrings: string[];
}

export interface MedicalAgendaItem {
  id: string;
  compromisso: string;
  medico: string;
  contato: string;
  especialidade: string;
  data: string;
  hora: string;
  local: string;
  observacoes: string;
  lembrete: string;
}

export interface AppSettings {
  onboardingDone: boolean;
  requestNotifications: boolean;
  fontScale: number;
  highContrast: boolean;
}

export interface AuthState {
  email: string;
  signedInAt: string;
}

export interface AnalyticsEvent {
  id: string;
  type: string;
  message: string;
  createdAt: string;
}

export interface TodayDoseEntry {
  key: string;
  medicationId: string;
  medicationName: string;
  dosage: string;
  time: string;
  dateTimeIso: string;
  taken: boolean;
  skipped: boolean;
  snoozedUntil?: string;
}
