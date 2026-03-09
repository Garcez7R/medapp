export type AppTab = 'medications' | 'exams' | 'health' | 'about';

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: number;
  duration: number;
  startTime: string;
  taken: boolean;
}
