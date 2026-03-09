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
