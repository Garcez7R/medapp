CREATE TABLE IF NOT EXISTS sync_records (
  patient_email TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by_email TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_records_updated_at ON sync_records(updated_at);

CREATE TABLE IF NOT EXISTS care_links (
  id TEXT PRIMARY KEY,
  patient_email TEXT NOT NULL,
  caregiver_email TEXT,
  role TEXT NOT NULL CHECK(role IN ('parente', 'responsavel', 'cuidador')),
  status TEXT NOT NULL CHECK(status IN ('pending', 'accepted', 'revoked')) DEFAULT 'pending',
  invite_code TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  accepted_at TEXT,
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_care_links_patient ON care_links(patient_email);
CREATE INDEX IF NOT EXISTS idx_care_links_caregiver ON care_links(caregiver_email);
