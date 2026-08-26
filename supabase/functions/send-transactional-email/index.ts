const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const clean = (value: unknown, max = 300) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

type AuthUser = {
  id: string;
  email: string;
  user_metadata?: { full_name?: string };
};

type EmailContent = {
  subject: string;
  preheader: string;
  title: string;
  greeting: string;
  paragraphs: string[];
  cta?: { label: string; url: string };
  note?: string;
};

const roleNames: Record<string, string> = {
  admin: "Administrador",
  manager: "Responsable",
  staff: "Empleado",
};

const emailHtml = (content: EmailContent) => {
  const paragraphs = content.paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;color:#363636;font-size:16px;line-height:1.65">${escapeHtml(paragraph)}</p>`,
    )
    .join("");
  const button = content.cta
    ? `<div style="margin:28px 0"><a href="${escapeHtml(content.cta.url)}" style="display:inline-block;border-radius:999px;background:#111111;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:15px 25px">${escapeHtml(content.cta.label)}</a></div>`
    : "";
  const note = content.note
    ? `<p style="margin:24px 0 0;border-radius:16px;background:#dff7ff;padding:16px;color:#3e3e3e;font-size:13px;line-height:1.55">${escapeHtml(content.note)}</p>`
    : "";

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(content.subject)}</title></head>
<body style="margin:0;background:#f5f5f2;font-family:Manrope,Inter,Arial,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(content.preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f2"><tr><td align="center" style="padding:36px 16px">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px">
      <tr><td style="border:1px solid #111111;border-bottom:0;border-radius:28px 28px 0 0;background:#f8b9e7;padding:28px 34px">
        <img src="https://www.fideleo.store/logo.svg" width="168" height="38" alt="Fideleo" style="display:block;width:168px;height:auto;border:0" />
      </td></tr>
      <tr><td style="border:1px solid #111111;border-radius:0 0 28px 28px;background:#ffffff;padding:38px 34px">
        <p style="margin:0 0 14px;color:#111111;font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase">Fideleo</p>
        <h1 style="margin:0 0 24px;color:#111111;font-size:32px;line-height:1.15;letter-spacing:-1px">${escapeHtml(content.title)}</h1>
        <p style="margin:0 0 16px;color:#111111;font-size:16px;line-height:1.65;font-weight:700">${escapeHtml(content.greeting)}</p>
        ${paragraphs}${button}${note}
      </td></tr>
      <tr><td style="padding:20px 6px 0;color:#6c6c6c;font-size:12px;line-height:1.5">© ${new Date().getUTCFullYear()} Fideleo · Este es un correo transaccional relacionado con tu cuenta o tarjeta.</td></tr>
    </table>
  </td></tr></table>
</body></html>`;
};

const emailText = (content: EmailContent) =>
  [
    content.title,
    "",
    content.greeting,
    ...content.paragraphs.flatMap((paragraph) => ["", paragraph]),
    ...(content.cta ? ["", `${content.cta.label}: ${content.cta.url}`] : []),
    ...(content.note ? ["", content.note] : []),
    "",
    "Fideleo",
  ].join("\n");

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Método no permitido" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");
    const appUrl = (Deno.env.get("APP_URL") || "https://fideleo.store").replace(/\/$/, "");
    const authorization = request.headers.get("Authorization");
    if (!supabaseUrl || !anonKey || !serviceKey || !resendApiKey || !fromEmail) {
      throw new Error("El servicio de email todavía no está configurado");
    }
    const payload = (await request.json()) as Record<string, unknown>;
    const kind = clean(payload.kind, 40);
    if (!authorization) return json({ error: "Sesión requerida" }, 401);
    const internalRequest = authorization === `Bearer ${serviceKey}`;
    if (internalRequest && kind !== "subscription_onboarding") {
      return json({ error: "Tipo de correo interno no permitido" }, 403);
    }

    let user: AuthUser | null = null;
    if (!internalRequest) {
      const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: { apikey: anonKey, Authorization: authorization },
      });
      if (!userResponse.ok) return json({ error: "Sesión no válida" }, 401);
      user = (await userResponse.json()) as AuthUser;
      if (!user.id || !user.email) return json({ error: "Usuario no válido" }, 401);
    }
    const databaseHeaders = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    };
    const selectOne = async <T>(path: string): Promise<T | null> => {
      const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
        headers: databaseHeaders,
      });
      if (!response.ok) throw new Error("No se pudieron cargar los datos del correo");
      const rows = (await response.json()) as T[];
      return rows[0] ?? null;
    };

    let recipient = user?.email.trim().toLowerCase() ?? "";
    let eventKey = "";
    let content: EmailContent;

    if (kind === "account_welcome") {
      const profile = await selectOne<{ full_name: string | null }>(
        `profiles?id=eq.${encodeURIComponent(user!.id)}&select=full_name&limit=1`,
      );
      const name = profile?.full_name || user!.user_metadata?.full_name || "";
      eventKey = `account_welcome:${user!.id}`;
      content = {
        subject: "Tu cuenta de Fideleo ya está activa",
        preheader: "Ya puedes acceder a tu panel de Fideleo.",
        title: "Bienvenido a Fideleo",
        greeting: name ? `Hola, ${name}.` : "Hola.",
        paragraphs: [
          "Tu dirección de email se ha verificado y tu cuenta ya está preparada.",
          "Desde el panel puedes gestionar tus establecimientos, clientes y programa de fidelización.",
        ],
        cta: { label: "Acceder a Fideleo", url: `${appUrl}/panel` },
      };
    } else if (kind === "team_invitation") {
      const invitationId = clean(payload.invitationId, 80);
      if (!invitationId) return json({ error: "Invitación no válida" }, 400);
      const invitation = await selectOne<{
        id: string;
        organization_id: string;
        user_id: string | null;
        invited_email: string | null;
        full_name: string | null;
        role: string;
      }>(
        `organization_users?id=eq.${encodeURIComponent(invitationId)}&select=id,organization_id,user_id,invited_email,full_name,role&limit=1`,
      );
      if (!invitation?.invited_email) return json({ error: "Invitación no encontrada" }, 404);
      const [callerMembership, superadmin, organization] = await Promise.all([
        selectOne<{ role: string }>(
          `organization_users?organization_id=eq.${encodeURIComponent(invitation.organization_id)}&user_id=eq.${encodeURIComponent(user!.id)}&status=eq.active&select=role&limit=1`,
        ),
        selectOne<{ platform_role: string }>(
          `profiles?id=eq.${encodeURIComponent(user!.id)}&platform_role=eq.superadmin&select=platform_role&limit=1`,
        ),
        selectOne<{ display_name: string }>(
          `organizations?id=eq.${encodeURIComponent(invitation.organization_id)}&select=display_name&limit=1`,
        ),
      ]);
      if (!superadmin && !["admin", "manager"].includes(callerMembership?.role || "")) {
        return json({ error: "No tienes permisos para enviar esta invitación" }, 403);
      }
      recipient = invitation.invited_email.trim().toLowerCase();

      // A new team member must be created through Supabase Auth. Auth invokes
      // send-auth-email, which delivers the branded invitation through Resend.
      if (!invitation.user_id) {
        eventKey = `team_auth_invitation:${invitation.id}`;
        const alreadyInvited = await selectOne<{ id: string }>(
          `transactional_email_deliveries?event_key=eq.${encodeURIComponent(eventKey)}&select=id&limit=1`,
        );
        if (alreadyInvited) return json({ ok: true, duplicate: true });

        const redirectTo = `${appUrl}/aceptar-invitacion`;
        const inviteResponse = await fetch(
          `${supabaseUrl}/auth/v1/invite?redirect_to=${encodeURIComponent(redirectTo)}`,
          {
            method: "POST",
            headers: databaseHeaders,
            body: JSON.stringify({
              email: recipient,
              data: {
                full_name: invitation.full_name || "",
                organization_name: organization?.display_name || "",
                organization_role: invitation.role,
              },
            }),
          },
        );
        if (!inviteResponse.ok) {
          const inviteError = (await inviteResponse.json()) as { message?: string; msg?: string };
          console.error("Supabase Auth invite failed", inviteResponse.status, inviteError);
          throw new Error(
            inviteError.message || inviteError.msg || "No se pudo crear la invitación",
          );
        }

        const logResponse = await fetch(`${supabaseUrl}/rest/v1/transactional_email_deliveries`, {
          method: "POST",
          headers: { ...databaseHeaders, Prefer: "return=minimal" },
          body: JSON.stringify({
            event_key: eventKey,
            kind,
            recipient,
            provider_message_id: null,
          }),
        });
        if (!logResponse.ok && logResponse.status !== 409) {
          console.error("No se pudo registrar la invitación", await logResponse.text());
        }
        return json({ ok: true });
      }

      eventKey = `team_invitation:${invitation.id}`;
      const signupUrl = `${appUrl}/auth?email=${encodeURIComponent(recipient)}`;
      content = {
        subject: "Te han invitado a Fideleo",
        preheader: "Accede a la plataforma con tu cuenta.",
        title: "Te han invitado a Fideleo",
        greeting: invitation.full_name ? `Hola, ${invitation.full_name}.` : "Hola.",
        paragraphs: [
          `${organization?.display_name || "Un negocio"} te ha dado de alta en su equipo con el rol de ${roleNames[invitation.role] || invitation.role}.`,
          "Tu email ya corresponde a una cuenta de Fideleo. Inicia sesión para acceder con tus nuevos permisos y establecimientos.",
        ],
        cta: { label: "Acceder a Fideleo", url: signupUrl },
        note: "Si no esperabas esta invitación, puedes ignorar este mensaje.",
      };
    } else if (kind === "membership_welcome") {
      const publicId = clean(payload.membershipPublicId, 80);
      const membership = await selectOne<{
        id: string;
        public_id: string;
        customer_id: string;
        organization_id: string;
        program_id: string;
        acquisition_location_id: string | null;
        cached_points_balance: number;
      }>(
        `memberships?public_id=eq.${encodeURIComponent(publicId)}&select=id,public_id,customer_id,organization_id,program_id,acquisition_location_id,cached_points_balance&limit=1`,
      );
      if (!membership) return json({ error: "Tarjeta no encontrada" }, 404);
      const [customer, organization, program, location] = await Promise.all([
        selectOne<{ email: string; first_name: string }>(
          `customers?id=eq.${encodeURIComponent(membership.customer_id)}&select=email,first_name&limit=1`,
        ),
        selectOne<{ display_name: string }>(
          `organizations?id=eq.${encodeURIComponent(membership.organization_id)}&select=display_name&limit=1`,
        ),
        selectOne<{ public_name: string }>(
          `loyalty_programs?id=eq.${encodeURIComponent(membership.program_id)}&select=public_name&limit=1`,
        ),
        membership.acquisition_location_id
          ? selectOne<{ name: string }>(
              `locations?id=eq.${encodeURIComponent(membership.acquisition_location_id)}&select=name&limit=1`,
            )
          : Promise.resolve(null),
      ]);
      if (!customer || customer.email.trim().toLowerCase() !== recipient) {
        return json({ error: "No tienes acceso a esta tarjeta" }, 403);
      }
      eventKey = `membership_welcome:${membership.id}`;
      const localName = location?.name ? ` en ${location.name}` : "";
      content = {
        subject: `Ya formas parte de ${organization?.display_name || "nuestro club"}`,
        preheader: "Tu tarjeta digital de fidelización ya está activa.",
        title: "Tu alta está confirmada",
        greeting: `Hola, ${customer.first_name}.`,
        paragraphs: [
          `Te has dado de alta correctamente${localName} y ya formas parte de ${organization?.display_name || "su programa de fidelización"}.`,
          `Tu tarjeta ${program?.public_name || "digital"} está lista y tiene un saldo inicial de ${membership.cached_points_balance} puntos o sellos.`,
          "Guárdala en tu móvil para tenerla siempre a mano cuando vuelvas al establecimiento.",
        ],
        cta: {
          label: "Ver mi tarjeta",
          url: `${appUrl}/mi-tarjeta/${encodeURIComponent(membership.public_id)}`,
        },
      };
    } else if (kind === "subscription_onboarding") {
      if (!internalRequest) return json({ error: "Operación no permitida" }, 403);
      const organizationId = clean(payload.organizationId, 80);
      const subscriptionId = clean(payload.subscriptionId, 255);
      if (!/^[0-9a-f-]{36}$/i.test(organizationId) || !subscriptionId) {
        return json({ error: "Suscripción no válida" }, 400);
      }
      const organization = await selectOne<{
        display_name: string;
        plan_code: string | null;
        subscription_status: string;
      }>(
        `organizations?id=eq.${encodeURIComponent(organizationId)}&select=display_name,plan_code,subscription_status&limit=1`,
      );
      if (
        !organization ||
        !["active", "trialing"].includes(organization.subscription_status) ||
        !["basic", "pro", "ultra"].includes(organization.plan_code || "")
      ) {
        return json({ error: "El plan todavía no está activo" }, 409);
      }
      const administrator = await selectOne<{
        user_id: string | null;
        invited_email: string | null;
        full_name: string | null;
      }>(
        `organization_users?organization_id=eq.${encodeURIComponent(organizationId)}&role=eq.admin&status=eq.active&select=user_id,invited_email,full_name&order=created_at.asc&limit=1`,
      );
      const profile = administrator?.user_id
        ? await selectOne<{ email: string; full_name: string | null }>(
            `profiles?id=eq.${encodeURIComponent(administrator.user_id)}&select=email,full_name&limit=1`,
          )
        : null;
      recipient = (profile?.email || administrator?.invited_email || "").trim().toLowerCase();
      if (!recipient) return json({ error: "Administrador sin email" }, 409);

      const planNames: Record<string, string> = {
        basic: "Basic",
        pro: "Pro",
        ultra: "Ultra",
      };
      const locationLimits: Record<string, number> = { basic: 1, pro: 3, ultra: 15 };
      const planCode = organization.plan_code!;
      const locationLimit = locationLimits[planCode];
      const name = profile?.full_name || administrator?.full_name || "";
      eventKey = `subscription_onboarding:${subscriptionId}`;
      content = {
        subject: `Tu plan ${planNames[planCode]} de Fideleo ya está activo`,
        preheader: "Empieza a configurar tu negocio y tu programa de fidelización.",
        title: "Ya puedes dar de alta tu negocio",
        greeting: name ? `Hola, ${name}.` : "Hola.",
        paragraphs: [
          `El pago se ha confirmado y tu plan ${planNames[planCode]} ya está activo para ${organization.display_name}.`,
          `Como administrador puedes completar ahora la configuración y dar de alta hasta ${locationLimit} establecimiento${locationLimit === 1 ? "" : "s"}.`,
          "El asistente te guiará por los datos del negocio, establecimientos, identidad visual, programa y tarjeta digital.",
        ],
        cta: { label: "Empezar el onboarding", url: `${appUrl}/panel/onboarding` },
        note: "Accede con el mismo email utilizado para crear tu cuenta de Fideleo.",
      };
    } else if (kind === "password_changed") {
      const eventId = clean(payload.eventId, 80);
      if (!/^[0-9a-f-]{36}$/i.test(eventId)) return json({ error: "Evento no válido" }, 400);
      eventKey = `password_changed:${user!.id}:${eventId}`;
      content = {
        subject: "Tu contraseña de Fideleo ha cambiado",
        preheader: "Confirmación de cambio de contraseña.",
        title: "Contraseña actualizada",
        greeting: "Hola.",
        paragraphs: [
          "La contraseña de tu cuenta de Fideleo se ha actualizado correctamente.",
          "Si has realizado este cambio, no necesitas hacer nada más.",
        ],
        cta: { label: "Acceder a Fideleo", url: `${appUrl}/auth` },
        note: "Si no reconoces este cambio, contacta inmediatamente con fideleo.app@gmail.com o por WhatsApp en el 695 83 40 18.",
      };
    } else {
      return json({ error: "Tipo de correo no válido" }, 400);
    }

    const alreadySent = await selectOne<{ id: string }>(
      `transactional_email_deliveries?event_key=eq.${encodeURIComponent(eventKey)}&select=id&limit=1`,
    );
    if (alreadySent) return json({ ok: true, duplicate: true });

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "Fideleo/1.0",
        "Idempotency-Key": eventKey.replaceAll(":", "-").slice(0, 256),
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [recipient],
        subject: content.subject,
        text: emailText(content),
        html: emailHtml(content),
      }),
    });
    const result = (await emailResponse.json()) as { id?: string; message?: string };
    if (!emailResponse.ok) {
      console.error("Resend error", emailResponse.status, result.message);
      throw new Error("No se pudo entregar el email");
    }

    const logResponse = await fetch(`${supabaseUrl}/rest/v1/transactional_email_deliveries`, {
      method: "POST",
      headers: { ...databaseHeaders, Prefer: "return=minimal" },
      body: JSON.stringify({
        event_key: eventKey,
        kind,
        recipient,
        provider_message_id: result.id || null,
      }),
    });
    if (!logResponse.ok && logResponse.status !== 409) {
      console.error("No se pudo registrar el envío", await logResponse.text());
    }
    return json({ ok: true });
  } catch (error) {
    console.error("send-transactional-email", error);
    return json(
      { error: error instanceof Error ? error.message : "No se pudo enviar el correo" },
      500,
    );
  }
});
