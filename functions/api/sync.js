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

  if (!isValidEmail(email)) {
    return badRequest("E-mail inválido para sincronização.");
  }
  if (provider !== "google") {
    return badRequest("Sincronização exige conta Google ativa.");
  }

  const row = await db
    .prepare(
      "SELECT payload, updated_at FROM sync_snapshots WHERE user_email = ?1 AND provider = ?2 LIMIT 1"
    )
    .bind(email, provider)
    .first();

  if (!row) {
    return json({ ok: true, found: false, payload: null, updatedAt: null });
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
  const payload = body?.payload;

  if (!isValidEmail(email)) {
    return badRequest("E-mail inválido para sincronização.");
  }
  if (provider !== "google") {
    return badRequest("Sincronização exige conta Google ativa.");
  }
  if (!payload || typeof payload !== "object") {
    return badRequest("Payload inválido para sincronização.");
  }

  const payloadString = JSON.stringify(payload);
  const updatedAt = new Date().toISOString();

  await db
    .prepare(
      `
      INSERT INTO sync_snapshots (user_email, provider, payload, updated_at)
      VALUES (?1, ?2, ?3, ?4)
      ON CONFLICT(user_email)
      DO UPDATE SET
        provider = excluded.provider,
        payload = excluded.payload,
        updated_at = excluded.updated_at
      `
    )
    .bind(email, provider, payloadString, updatedAt)
    .run();

  return json({
    ok: true,
    saved: true,
    updatedAt,
  });
}
