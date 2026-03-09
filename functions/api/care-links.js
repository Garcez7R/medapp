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
  return context?.env?.MEDAPP_DB ?? null;
}

function isValidEmail(email) {
  if (!email || typeof email !== "string") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function randomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < bytes.length; i += 1) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

function normalizeRole(role) {
  const value = String(role || "").trim().toLowerCase();
  if (value === "parente" || value === "responsavel" || value === "cuidador") return value;
  return null;
}

async function listLinks(db, email) {
  const asPatient = await db
    .prepare(
      `
      SELECT id, patient_email, caregiver_email, role, status, invite_code, created_at, accepted_at
      FROM care_links
      WHERE patient_email = ?1 AND status != 'revoked'
      ORDER BY created_at DESC
      `
    )
    .bind(email)
    .all();

  const asCaregiver = await db
    .prepare(
      `
      SELECT id, patient_email, caregiver_email, role, status, invite_code, created_at, accepted_at
      FROM care_links
      WHERE caregiver_email = ?1 AND status = 'accepted'
      ORDER BY accepted_at DESC
      `
    )
    .bind(email)
    .all();

  return {
    asPatient: asPatient.results || [],
    asCaregiver: asCaregiver.results || [],
  };
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

  if (!isValidEmail(email)) return badRequest("E-mail inválido.");
  if (provider !== "google") return badRequest("Vínculos exigem conta Google ativa.");

  const links = await listLinks(db, email);
  return json({ ok: true, ...links });
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

  const action = String(body?.action || "").trim().toLowerCase();
  const email = String(body?.email || "").trim().toLowerCase();
  const provider = String(body?.provider || "").trim().toLowerCase();

  if (!isValidEmail(email)) return badRequest("E-mail inválido.");
  if (provider !== "google") return badRequest("Vínculos exigem conta Google ativa.");

  if (action === "create") {
    const role = normalizeRole(body?.role);
    if (!role) return badRequest("Papel inválido para convite.");

    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const inviteCode = randomCode();

    await db
      .prepare(
        `
        INSERT INTO care_links (id, patient_email, caregiver_email, role, status, invite_code, created_at)
        VALUES (?1, ?2, NULL, ?3, 'pending', ?4, ?5)
        `
      )
      .bind(id, email, role, inviteCode, now)
      .run();

    return json({
      ok: true,
      invite: {
        id,
        patient_email: email,
        caregiver_email: null,
        role,
        status: "pending",
        invite_code: inviteCode,
        created_at: now,
      },
    });
  }

  if (action === "accept") {
    const code = String(body?.inviteCode || "").trim().toUpperCase();
    if (!code) return badRequest("Código de convite inválido.");

    const pending = await db
      .prepare(
        `
        SELECT id, patient_email, role, status
        FROM care_links
        WHERE invite_code = ?1
        ORDER BY created_at DESC
        LIMIT 1
        `
      )
      .bind(code)
      .first();

    if (!pending || pending.status !== "pending") {
      return badRequest("Convite não encontrado ou já utilizado.");
    }
    if (String(pending.patient_email).toLowerCase() === email) {
      return forbidden("Você não pode aceitar convite da sua própria conta.");
    }

    const acceptedAt = new Date().toISOString();
    await db
      .prepare(
        `
        UPDATE care_links
        SET caregiver_email = ?1,
            status = 'accepted',
            accepted_at = ?2
        WHERE id = ?3
        `
      )
      .bind(email, acceptedAt, pending.id)
      .run();

    const links = await listLinks(db, email);
    return json({ ok: true, accepted: true, ...links });
  }

  if (action === "revoke") {
    const linkId = String(body?.linkId || "").trim();
    if (!linkId) return badRequest("Link inválido.");

    const row = await db
      .prepare("SELECT patient_email, status FROM care_links WHERE id = ?1 LIMIT 1")
      .bind(linkId)
      .first();
    if (!row) return badRequest("Vínculo não encontrado.");
    if (String(row.patient_email).toLowerCase() !== email) {
      return forbidden("Somente o paciente pode revogar o vínculo.");
    }

    const revokedAt = new Date().toISOString();
    await db
      .prepare(
        `
        UPDATE care_links
        SET status = 'revoked', revoked_at = ?1
        WHERE id = ?2
        `
      )
      .bind(revokedAt, linkId)
      .run();

    const links = await listLinks(db, email);
    return json({ ok: true, revoked: true, ...links });
  }

  return badRequest("Ação inválida.");
}
