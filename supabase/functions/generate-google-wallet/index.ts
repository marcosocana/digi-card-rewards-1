const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { ...corsHeaders, "Cache-Control": "no-store" },
  });

type GoogleCredentials = { client_email: string; private_key: string; type?: string };
type Membership = {
  id: string;
  public_id: string;
  organization_id: string;
  customer_id: string;
  program_id: string;
  cached_points_balance: number;
};

const base64Url = (value: Uint8Array | string) => {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
};

const importPrivateKey = async (pem: string) => {
  const clean = pem.replace(
    /-----\s*BEGIN PRIVATE KEY\s*-----|-----\s*END PRIVATE KEY\s*-----|\n|\r/g,
    "",
  );
  const bytes = Uint8Array.from(atob(clean), (character) => character.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    bytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
};

const signJwt = async (credentials: GoogleCredentials, payload: Record<string, unknown>) => {
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(JSON.stringify(payload));
  const unsigned = `${header}.${claims}`;
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    await importPrivateKey(credentials.private_key),
    new TextEncoder().encode(unsigned),
  );
  return `${unsigned}.${base64Url(new Uint8Array(signature))}`;
};

const readCredentials = (): GoogleCredentials => {
  const raw =
    Deno.env.get("GOOGLE_WALLET_SERVICE_ACCOUNT_JSON") ??
    Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
  const encoded = Deno.env.get("GOOGLE_WALLET_SERVICE_ACCOUNT_JSON_BASE64");
  if (!raw && !encoded) throw new Error("GOOGLE_WALLET_CREDENTIALS_MISSING");

  let credentials: GoogleCredentials;
  try {
    credentials = JSON.parse(raw ?? atob(encoded!)) as GoogleCredentials;
  } catch {
    throw new Error("GOOGLE_WALLET_CREDENTIALS_INVALID");
  }
  if (!credentials.client_email || !credentials.private_key) {
    throw new Error("GOOGLE_WALLET_CREDENTIALS_INVALID");
  }
  return credentials;
};

const getGoogleAccessToken = async (credentials: GoogleCredentials) => {
  const now = Math.floor(Date.now() / 1000);
  const assertion = await signJwt(credentials, {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/wallet_object.issuer",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const body = await response.json();
  if (!response.ok || !body.access_token) {
    throw new Error(body.error_description ?? body.error ?? "GOOGLE_WALLET_AUTH_FAILED");
  }
  return body.access_token as string;
};

const walletError = async (response: Response, code: string) => {
  const detail = (await response.text()).slice(0, 500);
  return new Error(`${code} (${response.status})${detail ? `: ${detail}` : ""}`);
};

const first = async <T>(url: string, headers: Record<string, string>) => {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`DATABASE_QUERY_FAILED (${response.status})`);
  const rows = (await response.json()) as T[];
  return rows[0] ?? null;
};

const pointsBalance = (mechanic: string, balance: number) => {
  if (mechanic === "cashback") return `${(balance / 100).toFixed(2)} €`;
  if (mechanic === "spend") return `${balance} €`;
  return String(balance);
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  try {
    const authorization = request.headers.get("authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const issuerId = Deno.env.get("GOOGLE_WALLET_ISSUER_ID");
    if (!authorization?.startsWith("Bearer ")) return json({ error: "UNAUTHORIZED" }, 401);
    if (!supabaseUrl || !serviceKey) throw new Error("SUPABASE_CONFIGURATION_MISSING");
    if (!issuerId || !/^\d+$/.test(issuerId)) throw new Error("GOOGLE_WALLET_ISSUER_ID_MISSING");

    const credentials = readCredentials();
    const { membershipPublicId } = (await request.json()) as { membershipPublicId?: string };
    if (!membershipPublicId) return json({ error: "MEMBERSHIP_REQUIRED" }, 400);

    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: serviceKey, Authorization: authorization },
    });
    const authenticatedUser = (await authResponse.json()) as { id?: string; email?: string };
    if (!authResponse.ok || !authenticatedUser.id || !authenticatedUser.email) {
      return json({ error: "UNAUTHORIZED" }, 401);
    }

    const dbHeaders = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    };
    const membership = await first<Membership>(
      `${supabaseUrl}/rest/v1/memberships?public_id=eq.${encodeURIComponent(membershipPublicId)}&status=eq.active&select=id,public_id,organization_id,customer_id,program_id,cached_points_balance&limit=1`,
      dbHeaders,
    );
    if (!membership) return json({ error: "MEMBERSHIP_NOT_FOUND" }, 404);

    const [customer, organization, branding, program, token] = await Promise.all([
      first<{ email: string; first_name: string | null; last_name: string | null }>(
        `${supabaseUrl}/rest/v1/customers?id=eq.${membership.customer_id}&select=email,first_name,last_name&limit=1`,
        dbHeaders,
      ),
      first<{ display_name: string }>(
        `${supabaseUrl}/rest/v1/organizations?id=eq.${membership.organization_id}&select=display_name&limit=1`,
        dbHeaders,
      ),
      first<{
        wallet_background_color: string | null;
        wallet_logo_url: string | null;
        wallet_hero_url: string | null;
        wallet_program_name: string | null;
        wallet_points_label: string | null;
        logo_url: string | null;
        primary_color: string | null;
      }>(
        `${supabaseUrl}/rest/v1/organization_branding?organization_id=eq.${membership.organization_id}&select=wallet_background_color,wallet_logo_url,wallet_hero_url,wallet_program_name,wallet_points_label,logo_url,primary_color&limit=1`,
        dbHeaders,
      ),
      first<{ mechanic_type: string; public_name: string }>(
        `${supabaseUrl}/rest/v1/loyalty_programs?id=eq.${membership.program_id}&select=mechanic_type,public_name&limit=1`,
        dbHeaders,
      ),
      first<{ short_code: string }>(
        `${supabaseUrl}/rest/v1/membership_tokens?membership_id=eq.${membership.id}&status=eq.active&select=short_code&limit=1`,
        dbHeaders,
      ),
    ]);
    if (!customer || !organization || !program || !token) {
      throw new Error("MEMBERSHIP_DATA_INCOMPLETE");
    }
    if (customer.email.trim().toLowerCase() !== authenticatedUser.email.trim().toLowerCase()) {
      return json({ error: "FORBIDDEN" }, 403);
    }

    const configuredClassId = Deno.env.get("GOOGLE_WALLET_CLASS_ID")?.trim();
    const classSuffix = `fideleo_${membership.organization_id.replaceAll("-", "")}`;
    const classId = configuredClassId
      ? configuredClassId.includes(".")
        ? configuredClassId
        : `${issuerId}.${configuredClassId}`
      : `${issuerId}.${classSuffix}`;
    if (!classId.startsWith(`${issuerId}.`)) throw new Error("GOOGLE_WALLET_CLASS_ID_INVALID");
    const objectId = `${issuerId}.${membership.public_id}`;
    const organizationName = organization.display_name || "Fideleo";
    const logoUrl =
      branding?.wallet_logo_url ??
      branding?.logo_url ??
      `${Deno.env.get("WALLET_PUBLIC_BASE_URL") ?? "https://fideleo.store"}/isotipo.svg`;
    const classBody: Record<string, unknown> = {
      id: classId,
      issuerName: organizationName,
      programName: branding?.wallet_program_name || program.public_name || organizationName,
      programLogo: {
        sourceUri: { uri: logoUrl },
        contentDescription: {
          defaultValue: { language: "es-ES", value: `Logo de ${organizationName}` },
        },
      },
      accountNameLabel: "Cliente",
      accountIdLabel: "N.º de socio",
      hexBackgroundColor: branding?.wallet_background_color || branding?.primary_color || "#7A4A2B",
      countryCode: "ES",
    };
    if (branding?.wallet_hero_url) {
      classBody.heroImage = {
        sourceUri: { uri: branding.wallet_hero_url },
        contentDescription: {
          defaultValue: { language: "es-ES", value: `Imagen de ${organizationName}` },
        },
      };
    }

    const accessToken = await getGoogleAccessToken(credentials);
    const walletHeaders = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };
    const classEndpoint = `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass/${encodeURIComponent(classId)}`;
    const existingClass = await fetch(classEndpoint, { headers: walletHeaders });
    if (existingClass.status === 404) {
      const created = await fetch(
        "https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass",
        {
          method: "POST",
          headers: walletHeaders,
          body: JSON.stringify({ ...classBody, reviewStatus: "UNDER_REVIEW" }),
        },
      );
      if (!created.ok) throw await walletError(created, "GOOGLE_CLASS_CREATE_FAILED");
    } else if (existingClass.ok) {
      const patched = await fetch(classEndpoint, {
        method: "PATCH",
        headers: walletHeaders,
        // Google changes approved classes back to review whenever their shared
        // presentation is updated. Sending the server-returned APPROVED value
        // (or omitting the required transition) makes the API reject the patch.
        body: JSON.stringify({ ...classBody, reviewStatus: "UNDER_REVIEW" }),
      });
      if (!patched.ok) throw await walletError(patched, "GOOGLE_CLASS_UPDATE_FAILED");
    } else {
      throw await walletError(existingClass, "GOOGLE_CLASS_READ_FAILED");
    }

    const customerName =
      [customer.first_name, customer.last_name].filter(Boolean).join(" ") || customer.email;
    const loyaltyObject = {
      id: objectId,
      classId,
      accountName: customerName,
      accountId: membership.public_id,
      state: "ACTIVE",
      barcode: { type: "QR_CODE", value: token.short_code, alternateText: token.short_code },
      loyaltyPoints: {
        label:
          branding?.wallet_points_label ||
          (program.mechanic_type === "stamps" ? "Sellos" : "Puntos"),
        balance: { string: pointsBalance(program.mechanic_type, membership.cached_points_balance) },
      },
    };

    const objectEndpoint = `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${encodeURIComponent(objectId)}`;
    const existingObject = await fetch(objectEndpoint, { headers: walletHeaders });
    if (existingObject.ok) {
      const patched = await fetch(objectEndpoint, {
        method: "PATCH",
        headers: walletHeaders,
        body: JSON.stringify(loyaltyObject),
      });
      if (!patched.ok) throw await walletError(patched, "GOOGLE_OBJECT_UPDATE_FAILED");
    } else if (existingObject.status !== 404) {
      throw await walletError(existingObject, "GOOGLE_OBJECT_READ_FAILED");
    }

    const now = Math.floor(Date.now() / 1000);
    const publicBaseUrl = Deno.env.get("WALLET_PUBLIC_BASE_URL");
    const origins = publicBaseUrl ? [new URL(publicBaseUrl).origin] : [];
    const jwt = await signJwt(credentials, {
      iss: credentials.client_email,
      aud: "google",
      origins,
      typ: "savetowallet",
      payload: { loyaltyObjects: [loyaltyObject] },
      iat: now,
      exp: now + 3600,
    });

    const passResponse = await fetch(
      `${supabaseUrl}/rest/v1/wallet_passes?on_conflict=membership_id,provider`,
      {
        method: "POST",
        headers: { ...dbHeaders, Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({
          membership_id: membership.id,
          provider: "google",
          provider_object_id: objectId,
          serial_number: membership.public_id,
          status: existingObject.ok ? "active" : "pending_generation",
          is_sandbox: false,
          last_generated_at: new Date().toISOString(),
          last_error_code: null,
          last_error_message: null,
        }),
      },
    );
    if (!passResponse.ok) throw new Error(`WALLET_PASS_SAVE_FAILED (${passResponse.status})`);

    await fetch(
      `${supabaseUrl}/rest/v1/wallet_integration_settings?on_conflict=organization_id,provider`,
      {
        method: "POST",
        headers: { ...dbHeaders, Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({
          organization_id: membership.organization_id,
          provider: "google",
          mode: "live",
          status: "active",
          public_configuration: { issuer_id: issuerId },
          last_verified_at: new Date().toISOString(),
          last_error: null,
        }),
      },
    );

    return json({ url: `https://pay.google.com/gp/v/save/${jwt}` });
  } catch (error) {
    console.error("generate-google-wallet", error);
    const message = error instanceof Error ? error.message : "GOOGLE_WALLET_FAILED";
    const status = message.includes("MISSING") || message.includes("INVALID") ? 500 : 502;
    return json({ error: message }, status);
  }
});
