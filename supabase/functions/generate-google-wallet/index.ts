const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apiKey, content-type",
};

const base64Url = (value: Uint8Array | string) => {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
};

type GoogleCredentials = { client_email: string; private_key: string };

const signJwt = async (credentials: GoogleCredentials, payload: Record<string, unknown>) => {
  const privateKeyClean = credentials.private_key.replace(
    /-----\s*BEGIN PRIVATE KEY\s*-----|-----\s*END PRIVATE KEY\s*-----|\n|\r/g,
    "",
  );
  const binaryKey = Uint8Array.from(atob(privateKeyClean), (character) => character.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    true,
    ["sign"],
  );
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(JSON.stringify(payload));
  const unsignedToken = `${header}.${claims}`;
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsignedToken),
  );
  return `${unsignedToken}.${base64Url(new Uint8Array(signature))}`;
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
  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(`Google OAuth respondió ${response.status}`);
  }
  return data.access_token as string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Datos que envía Lovable
    const { userUuid, customerName, currentPoints, membershipPublicId } = await req.json();

    if (!userUuid || !membershipPublicId) {
      throw new Error("Faltan los datos de la sesión o de la tarjeta");
    }

    // 2. Leer la clave de Google desde el Vault de Supabase
    const googleCredentialsJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!googleCredentialsJson) {
      throw new Error("Falta la variable GOOGLE_SERVICE_ACCOUNT_JSON en Supabase");
    }
    const credentials = JSON.parse(googleCredentialsJson) as GoogleCredentials;

    // Configuración con tus IDs reales de Google Wallet
    const ISSUER_ID = "3388000000023188333"; // Tu ID de emisor de la captura
    let classSuffix = "tarjeta_sellos_v1";
    let membershipId: string | null = null;
    let pointsLabel = "Sellos acumulados";

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const serviceHeaders =
      supabaseUrl && serviceKey
        ? {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          }
        : null;

    if (!supabaseUrl || !serviceKey || !serviceHeaders) {
      throw new Error("Falta la configuración segura de Supabase");
    }
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      throw new Error("La sesión ha caducado");
    }
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: serviceKey, Authorization: authorization },
    });
    const authenticatedUser = (await authResponse.json()) as { id?: string; email?: string };
    if (!authResponse.ok || !authenticatedUser.id || authenticatedUser.id !== userUuid) {
      throw new Error("La sesión no corresponde al cliente de la tarjeta");
    }

    if (membershipPublicId) {
      const membershipResponse = await fetch(
        `${supabaseUrl}/rest/v1/memberships?public_id=eq.${encodeURIComponent(membershipPublicId)}&select=id,organization_id,customers!inner(email)&limit=1`,
        { headers: serviceHeaders },
      );
      const memberships = (await membershipResponse.json()) as Array<{
        id: string;
        organization_id: string;
        customers: { email: string };
      }>;
      const membership = memberships[0];
      if (membership) {
        if (
          !authenticatedUser.email ||
          membership.customers.email.trim().toLowerCase() !==
            authenticatedUser.email.trim().toLowerCase()
        ) {
          throw new Error("No tienes acceso a esta tarjeta");
        }
        membershipId = membership.id;
        classSuffix = `fideleo_${membership.organization_id.replaceAll("-", "")}`;
        const [organizationResponse, brandingResponse] = await Promise.all([
          fetch(
            `${supabaseUrl}/rest/v1/organizations?id=eq.${encodeURIComponent(membership.organization_id)}&select=display_name&limit=1`,
            { headers: serviceHeaders },
          ),
          fetch(
            `${supabaseUrl}/rest/v1/organization_branding?organization_id=eq.${encodeURIComponent(membership.organization_id)}&select=wallet_background_color,wallet_logo_url,wallet_hero_url,wallet_program_name,wallet_points_label,logo_url,primary_color&limit=1`,
            { headers: serviceHeaders },
          ),
        ]);
        const organizations = (await organizationResponse.json()) as Array<{
          display_name: string;
        }>;
        const brandings = (await brandingResponse.json()) as Array<{
          wallet_background_color: string | null;
          wallet_logo_url: string | null;
          wallet_hero_url: string | null;
          wallet_program_name: string | null;
          wallet_points_label: string | null;
          logo_url: string | null;
          primary_color: string | null;
        }>;
        const organizationName = organizations[0]?.display_name || "Fideleo";
        const branding = brandings[0];
        pointsLabel = branding?.wallet_points_label || "Puntos";
        const classId = `${ISSUER_ID}.${classSuffix}`;
        const logoUrl =
          branding?.wallet_logo_url ||
          branding?.logo_url ||
          "https://fideleovdos.vercel.app/isotipo.svg";
        const classBody: Record<string, unknown> = {
          id: classId,
          issuerName: organizationName,
          programName: branding?.wallet_program_name || organizationName,
          programLogo: {
            sourceUri: { uri: logoUrl },
            contentDescription: {
              defaultValue: { language: "es-ES", value: `Logo de ${organizationName}` },
            },
          },
          accountNameLabel: "Cliente",
          accountIdLabel: "Identificador",
          hexBackgroundColor:
            branding?.wallet_background_color || branding?.primary_color || "#7A4A2B",
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
        const existingResponse = await fetch(classEndpoint, { headers: walletHeaders });
        if (existingResponse.status === 404) {
          const createResponse = await fetch(
            "https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass",
            {
              method: "POST",
              headers: walletHeaders,
              body: JSON.stringify({ ...classBody, reviewStatus: "UNDER_REVIEW" }),
            },
          );
          if (!createResponse.ok) {
            throw new Error(`Google Wallet no pudo crear la clase (${createResponse.status})`);
          }
        } else if (existingResponse.ok) {
          const existing = await existingResponse.json();
          const designChanged =
            existing.programName !== classBody.programName ||
            existing.hexBackgroundColor?.toLowerCase() !==
              String(classBody.hexBackgroundColor).toLowerCase() ||
            existing.programLogo?.sourceUri?.uri !== logoUrl ||
            (existing.heroImage?.sourceUri?.uri || null) !== (branding?.wallet_hero_url || null);
          if (designChanged) {
            const patchResponse = await fetch(classEndpoint, {
              method: "PATCH",
              headers: walletHeaders,
              body: JSON.stringify({ ...classBody, reviewStatus: "UNDER_REVIEW" }),
            });
            if (!patchResponse.ok) {
              throw new Error(
                `Google Wallet no pudo actualizar la clase (${patchResponse.status})`,
              );
            }
          }
        } else {
          throw new Error(`Google Wallet no pudo consultar la clase (${existingResponse.status})`);
        }
      } else {
        throw new Error("Tarjeta no encontrada");
      }
    }

    // 3. Estructura de la tarjeta del cliente
    const loyaltyObject = {
      id: `${ISSUER_ID}.${membershipPublicId}`,
      classId: `${ISSUER_ID}.${classSuffix}`,
      accountName: customerName,
      accountId: userUuid,
      state: "ACTIVE",
      barcode: {
        type: "QR_CODE",
        value: userUuid,
      },
      loyaltyPoints: {
        label: pointsLabel,
        balance: {
          string: `${currentPoints} / 10`,
        },
      },
    };

    // 4. Configurar el Payload para Google
    const payload = {
      iss: credentials.client_email,
      aud: "google",
      origins: [],
      typ: "savetowallet",
      payload: {
        loyaltyObjects: [loyaltyObject],
      },
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    // 5. Firmar el token JWT y generar enlace público
    const jwt = await signJwt(credentials, payload);
    const saveUrl = `https://pay.google.com/gp/v/save/${jwt}`;

    if (membershipId) {
      await fetch(
        `${supabaseUrl}/rest/v1/wallet_passes?membership_id=eq.${membershipId}&provider=eq.google`,
        {
          method: "PATCH",
          headers: serviceHeaders,
          body: JSON.stringify({
            provider_object_id: loyaltyObject.id,
            status: "active",
            is_sandbox: false,
            last_generated_at: new Date().toISOString(),
            last_error_code: null,
            last_error_message: null,
          }),
        },
      );
    }

    return new Response(JSON.stringify({ url: saveUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Error desconocido" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
    );
  }
});
