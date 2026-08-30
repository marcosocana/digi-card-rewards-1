const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = request.headers.get("Authorization") || "";
  if (!supabaseUrl || !anonKey || !serviceKey || !authorization.startsWith("Bearer ")) {
    return json({ error: "El alta administrativa no está configurada" }, 503);
  }

  const callerResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: authorization },
  });
  if (!callerResponse.ok) return json({ error: "Sesión no válida" }, 401);
  const caller = (await callerResponse.json()) as { id?: string };
  if (!caller.id) return json({ error: "Sesión no válida" }, 401);

  const serviceHeaders = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };
  const profileResponse = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(caller.id)}&platform_role=eq.superadmin&select=id&limit=1`,
    { headers: serviceHeaders },
  );
  const profiles = profileResponse.ok ? await profileResponse.json() : [];
  if (!Array.isArray(profiles) || profiles.length === 0) {
    return json({ error: "Solo el modo dios puede crear empresas de pago" }, 403);
  }

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const email = clean(payload.ownerEmail, 254).toLowerCase();
    const password = clean(payload.password, 128);
    const passwordConfirmation = clean(payload.passwordConfirmation, 128);
    const ownerName = clean(payload.ownerName, 120);
    const displayName = clean(payload.displayName, 160);
    const planCode = clean(payload.planCode, 20);
    const rawLocations = Array.isArray(payload.locations) ? payload.locations : [];
    const locations = rawLocations.slice(0, 15).map((item) => {
      const location = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      return {
        name: clean(location.name, 160),
        addressLine: clean(location.addressLine, 250),
        city: clean(location.city, 120),
        postalCode: clean(location.postalCode, 24),
      };
    });

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "Introduce un email de usuario válido" }, 400);
    }
    if (password.length < 8) {
      return json({ error: "La contraseña debe tener al menos 8 caracteres" }, 400);
    }
    if (password !== passwordConfirmation) {
      return json({ error: "Las contraseñas no coinciden" }, 400);
    }
    if (ownerName.length < 2 || displayName.length < 2) {
      return json({ error: "Completa el nombre del usuario y de la empresa" }, 400);
    }
    if (!["basic", "pro", "ultra"].includes(planCode)) {
      return json({ error: "Selecciona un plan válido" }, 400);
    }

    const existenceResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/registration_email_exists`, {
      method: "POST",
      headers: serviceHeaders,
      body: JSON.stringify({ _email: email }),
    });
    if (!existenceResponse.ok) throw new Error("No se pudo comprobar el email del usuario");
    if ((await existenceResponse.json()) === true) {
      return json({
        ok: false,
        code: "account_exists",
        error:
          "Ya existe una cuenta con este email. Utiliza otro email para el nuevo administrador.",
      });
    }

    const prepareResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/admin_prepare_paid_company`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: authorization,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        _display_name: displayName,
        _legal_name: clean(payload.legalName, 200),
        _contact_email:
          clean(payload.contactEmail, 254).toLowerCase() ||
          clean(payload.email, 254).toLowerCase() ||
          email,
        _contact_phone: clean(payload.contactPhone, 40) || clean(payload.phone, 40),
        _address_line: clean(payload.addressLine, 250) || clean(payload.address, 250),
        _city: clean(payload.city, 120),
        _postal_code: clean(payload.postalCode, 24),
        _plan_code: planCode,
        _owner_name: ownerName,
        _owner_email: email,
        _locations: locations,
      }),
    });
    const prepared = await prepareResponse.json();
    if (!prepareResponse.ok) {
      const message = prepared?.message || prepared?.error || "No se pudo preparar la empresa";
      if (message === "ACCOUNT_EXISTS" || prepareResponse.status === 409) {
        return json({
          ok: false,
          code: "account_exists",
          error:
            "Ya existe una cuenta con este email. Utiliza otro email para el nuevo administrador.",
        });
      }
      return json({ error: message }, prepareResponse.status);
    }

    const organizationId = prepared?.organization_id as string | undefined;
    if (!organizationId) throw new Error("Supabase no ha devuelto la empresa creada");

    const uploadAsset = async (value: unknown, kind: "logo" | "cover") => {
      if (typeof value !== "string" || !value.startsWith("data:image/")) return null;
      if (value.length > 4_500_000) throw new Error("Una de las imágenes es demasiado grande");
      const match = value.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/s);
      if (!match) throw new Error("Formato de imagen no válido");
      const mime = match[1];
      const extension = mime === "image/jpeg" ? "jpg" : mime.split("/")[1];
      const binary = atob(match[2]);
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      const path = `${organizationId}/${kind}-${crypto.randomUUID()}.${extension}`;
      const uploadResponse = await fetch(
        `${supabaseUrl}/storage/v1/object/brand-assets/${encodeURIComponent(path)}`,
        {
          method: "POST",
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": mime,
            "x-upsert": "true",
          },
          body: bytes,
        },
      );
      if (!uploadResponse.ok) throw new Error(`No se pudo guardar ${kind}`);
      const signResponse = await fetch(
        `${supabaseUrl}/storage/v1/object/sign/brand-assets/${encodeURIComponent(path)}`,
        {
          method: "POST",
          headers: serviceHeaders,
          body: JSON.stringify({ expiresIn: 31_536_000 }),
        },
      );
      const signed = await signResponse.json();
      if (!signResponse.ok || !signed.signedURL) throw new Error(`No se pudo preparar ${kind}`);
      return `${supabaseUrl}/storage/v1${signed.signedURL}`;
    };

    try {
      const [logoUrl, coverUrl] = await Promise.all([
        uploadAsset(payload.logo, "logo"),
        uploadAsset(payload.cover, "cover"),
      ]);
      const organizationResponse = await fetch(
        `${supabaseUrl}/rest/v1/organizations?id=eq.${encodeURIComponent(organizationId)}`,
        {
          method: "PATCH",
          headers: serviceHeaders,
          body: JSON.stringify({
            category: clean(payload.category, 120) || null,
            website: clean(payload.website, 300) || null,
            instagram: clean(payload.instagram, 160) || null,
            onboarding_step: 5,
            onboarding_completed_at: new Date().toISOString(),
          }),
        },
      );
      const brandingResponse = await fetch(
        `${supabaseUrl}/rest/v1/organization_branding?on_conflict=organization_id`,
        {
          method: "POST",
          headers: { ...serviceHeaders, Prefer: "resolution=merge-duplicates" },
          body: JSON.stringify({
            organization_id: organizationId,
            primary_color: clean(payload.primary, 20) || "#3B2415",
            secondary_color: clean(payload.secondary, 20) || "#D4A574",
            background_color: clean(payload.background, 20) || "#FBF7F0",
            text_color: clean(payload.text, 20) || "#1F1A16",
            logo_url: logoUrl,
            cover_url: coverUrl,
            program_description:
              clean(payload.walletHeadline, 240) || "Tu fidelidad, siempre contigo",
          }),
        },
      );
      const programsResponse = await fetch(
        `${supabaseUrl}/rest/v1/loyalty_programs?organization_id=eq.${encodeURIComponent(organizationId)}`,
        {
          method: "PATCH",
          headers: serviceHeaders,
          body: JSON.stringify({
            public_name: clean(payload.programName, 160) || `Club ${displayName}`,
            description: clean(payload.programDescription, 600) || null,
            mechanic_type: clean(payload.mechanic, 30) || "spend",
            terms: clean(payload.terms, 2000) || null,
            status: "active",
          }),
        },
      );
      const campaignsResponse = await fetch(
        `${supabaseUrl}/rest/v1/campaigns?organization_id=eq.${encodeURIComponent(organizationId)}`,
        {
          method: "PATCH",
          headers: serviceHeaders,
          body: JSON.stringify({ status: "active" }),
        },
      );
      if (
        !organizationResponse.ok ||
        !brandingResponse.ok ||
        !programsResponse.ok ||
        !campaignsResponse.ok
      ) {
        throw new Error("No se pudo guardar la configuración del club");
      }
    } catch (configurationError) {
      await fetch(
        `${supabaseUrl}/rest/v1/organizations?id=eq.${encodeURIComponent(organizationId)}`,
        { method: "DELETE", headers: serviceHeaders },
      );
      throw configurationError;
    }

    const userResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers: serviceHeaders,
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: ownerName, business_name: displayName },
      }),
    });
    const user = await userResponse.json();
    if (!userResponse.ok) {
      await fetch(
        `${supabaseUrl}/rest/v1/organizations?id=eq.${encodeURIComponent(organizationId)}`,
        {
          method: "DELETE",
          headers: serviceHeaders,
        },
      );
      if (userResponse.status === 409 || user?.code === "email_exists") {
        return json({
          ok: false,
          code: "account_exists",
          error:
            "Ya existe una cuenta con este email. Utiliza otro email para el nuevo administrador.",
        });
      }
      return json({
        ok: false,
        error: user?.msg || user?.message || "No se pudo crear el usuario",
      });
    }

    const confirmationResponse = await fetch(
      `${supabaseUrl}/functions/v1/send-transactional-email`,
      {
        method: "POST",
        headers: serviceHeaders,
        body: JSON.stringify({
          kind: "manual_account_confirmation",
          organizationId,
          userId: user.id,
        }),
      },
    );

    return json({
      ok: true,
      organizationId,
      userId: user.id,
      locationsCreated: prepared.locations_created,
      emailSent: confirmationResponse.ok,
    });
  } catch (error) {
    console.error("admin-provision-company", error instanceof Error ? error.message : error);
    return json({ error: "No se pudo completar el alta de la empresa" }, 500);
  }
});
