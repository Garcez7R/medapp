import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  BellRing,
  CalendarDays,
  FileText,
  History,
  ScrollText,
  ShieldCheck,
  Syringe,
  UserRound,
  NotebookPen
} from 'lucide-react';

export type MainTab = 'medications' | 'agenda' | 'about';

export type DrawerPageKey =
  | 'agenda_medica'
  | 'vacinas'
  | 'diario'
  | 'receitas'
  | 'relatorios'
  | 'central_notificacoes'
  | 'perfil'
  | 'historico'
  | 'termos'
  | 'privacidade';

export type ActivePage = MainTab | DrawerPageKey;

export const drawerItems: Array<{ key: DrawerPageKey; label: string; icon: LucideIcon }> = [
  { key: 'agenda_medica', label: 'Agenda Médica', icon: CalendarDays },
  { key: 'vacinas', label: 'Vacinas', icon: Syringe },
  { key: 'receitas', label: 'Receitas Médicas', icon: FileText },
  { key: 'diario', label: 'Diário de Saúde', icon: NotebookPen },
  { key: 'central_notificacoes', label: 'Central de Notificações', icon: BellRing },
  { key: 'historico', label: 'Histórico de Atividades', icon: History },
  { key: 'relatorios', label: 'Relatórios', icon: BarChart3 },
  { key: 'perfil', label: 'Perfil e Preferências', icon: UserRound },
  { key: 'termos', label: 'Termos e Privacidade', icon: ScrollText },
  { key: 'privacidade', label: 'Privacidade e Segurança', icon: ShieldCheck }
];
