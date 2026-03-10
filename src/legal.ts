export const LEGAL_TERMS_VERSION = '2026.03.10';
export const LEGAL_STORAGE_KEY = 'medapp.legal.acceptance';

export type LegalAcceptanceRecord = {
  version: string;
  acceptedAt: string;
};

export function loadLegalAcceptance(): LegalAcceptanceRecord | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(LEGAL_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<LegalAcceptanceRecord>;
    if (!parsed.version || !parsed.acceptedAt) return null;
    return {
      version: String(parsed.version),
      acceptedAt: String(parsed.acceptedAt)
    };
  } catch {
    return null;
  }
}

export function hasAcceptedCurrentLegalVersion(): boolean {
  const accepted = loadLegalAcceptance();
  return Boolean(accepted && accepted.version === LEGAL_TERMS_VERSION);
}

export function saveLegalAcceptance(version = LEGAL_TERMS_VERSION): LegalAcceptanceRecord {
  const next: LegalAcceptanceRecord = {
    version,
    acceptedAt: new Date().toISOString()
  };
  if (typeof window !== 'undefined') {
    localStorage.setItem(LEGAL_STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}
