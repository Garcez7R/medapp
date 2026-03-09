function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
    ...init,
  });
}

function badRequest(message) {
  return json({ ok: false, error: message }, { status: 400 });
}

function forbidden(message) {
  return json({ ok: false, error: message }, { status: 403 });
}

function getDb(context) {
  const db = context?.env?.MEDAPP_DB;
  if (!db) {
    return null;
  }
  return db;
}

function isValidEmail(email) {
  if (!email || typeof email !== "string") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

async function resolveAccess(db, userEmail, targetPatientEmail, mode) {
  if (userEmail === targetPatientEmail) {
    return { ok: true, role: "paciente" };
  }

  const row = await db
    .prepare(
      `
      SELECT role, status
      FROM care_links
      WHERE patient_email = ?1
        AND caregiver_email = ?2
      ORDER BY created_at DESC
      LIMIT 1
      `
    )
    .bind(targetPatientEmail, userEmail)
    .first();

  if (!row || row.status !== "accepted") {
    return { ok: false, error: "Sem vínculo aceito para acessar este paciente." };
  }

  const role = String(row.role || "");
  if (mode === "write" && role === "parente") {
    return { ok: false, error: "Perfil parente possui acesso somente leitura." };
  }

  return { ok: true, role };
}

export async function onRequestGet(context) {
  const db = getDb(context);
  if (!db) {
    return json(
      { ok: false, error: "Binding MEDAPP_DB não configurado no ambiente Cloudflare." },
      { status: 500 }
    );
  }

  const url = new URL(context.request.url);
  const email = (url.searchParams.get("email") || "").trim().toLowerCase();
  const provider = (url.searchParams.get("provider") || "").trim().toLowerCase();
  const patientEmail = (url.searchParams.get("patientEmail") || email).trim().toLowerCase();

  if (!isValidEmail(email)) return badRequest("E-mail inválido para sincronização.");
  if (!isValidEmail(patientEmail)) return badRequest("Paciente inválido para sincronização.");
  if (provider !== "google") return badRequest("Sincronização exige conta Google ativa.");

  const access = await resolveAccess(db, email, patientEmail, "read");
  if (!access.ok) return forbidden(access.error);

  const row = await db
    .prepare(
      "SELECT payload, updated_at, updated_by_email FROM sync_records WHERE patient_email = ?1 LIMIT 1"
    )
    .bind(patientEmail)
    .first();

  if (!row) {
    return json({
      ok: true,
      found: false,
      payload: null,
      updatedAt: null,
      updatedBy: null,
      accessRole: access.role,
      patientEmail,
    });
  }

  let payload = null;
  try {
    payload = JSON.parse(String(row.payload || "{}"));
  } catch {
    return json({ ok: false, error: "Snapshot armazenado está inválido." }, { status: 500 });
  }

  return json({
    ok: true,
    found: true,
    payload,
    updatedAt: row.updated_at || null,
    updatedBy: row.updated_by_email || null,
    accessRole: access.role,
    patientEmail,
  });
}

export async function onRequestPost(context) {
  const db = getDb(context);
  if (!db) {
    return json(
      { ok: false, error: "Binding MEDAPP_DB não configurado no ambiente Cloudflare." },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return badRequest("Corpo JSON inválido.");
  }

  const email = String(body?.email || "").trim().toLowerCase();
  const provider = String(body?.provider || "").trim().toLowerCase();
  const patientEmail = String(body?.patientEmail || email).trim().toLowerCase();
  const payload = body?.payload;

  if (!isValidEmail(email)) return badRequest("E-mail inválido para sincronização.");
  if (!isValidEmail(patientEmail)) return badRequest("Paciente inválido para sincronização.");
  if (provider !== "google") return badRequest("Sincronização exige conta Google ativa.");
  if (!payload || typeof payload !== "object") return badRequest("Payload inválido para sincronização.");

  const access = await resolveAccess(db, email, patientEmail, "write");
  if (!access.ok) return forbidden(access.error);

  const payloadString = JSON.stringify(payload);
  const updatedAt = new Date().toISOString();

  await db
    .prepare(
      `
      INSERT INTO sync_records (patient_email, payload, updated_at, updated_by_email)
      VALUES (?1, ?2, ?3, ?4)
      ON CONFLICT(patient_email)
      DO UPDATE SET
        payload = excluded.payload,
        updated_at = excluded.updated_at,
        updated_by_email = excluded.updated_by_email
      `
    )
    .bind(patientEmail, payloadString, updatedAt, email)
    .run();

  return json({
    ok: true,
    saved: true,
    updatedAt,
    accessRole: access.role,
    patientEmail,
  });
}
