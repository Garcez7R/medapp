CREATE TABLE IF NOT EXISTS sync_snapshots (
  user_email TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  payload TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_snapshots_provider ON sync_snapshots(provider);
