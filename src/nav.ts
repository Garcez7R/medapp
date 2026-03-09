export type MainTab = 'medications' | 'agenda' | 'about';

export type DrawerPageKey =
  | 'agenda_medica'
  | 'vacinas'
  | 'diario'
  | 'receitas'
  | 'relatorios'
  | 'central_notificacoes'
  | 'perfil'
  | 'calendario'
  | 'historico'
  | 'privacidade';

export type ActivePage = MainTab | DrawerPageKey;

export const drawerItems: Array<{ key: DrawerPageKey; label: string; icon: string }> = [
  { key: 'agenda_medica', label: 'Agenda Médica', icon: '📅' },
  { key: 'vacinas', label: 'Vacinas', icon: '💉' },
  { key: 'diario', label: 'Diário de Saúde', icon: '📝' },
  { key: 'receitas', label: 'Receitas Médicas', icon: '📄' },
  { key: 'relatorios', label: 'Relatórios', icon: '📊' },
  { key: 'central_notificacoes', label: 'Central de Notificações', icon: '🔔' },
  { key: 'perfil', label: 'Perfil e Preferências', icon: '👤' },
  { key: 'calendario', label: 'Calendário da Saúde', icon: '🗓️' },
  { key: 'historico', label: 'Histórico de Atividades', icon: '🕘' },
  { key: 'privacidade', label: 'Privacidade e Segurança', icon: '🔒' }
];
