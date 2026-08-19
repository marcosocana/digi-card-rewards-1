import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY;
if (!url || !anonKey) throw new Error("Faltan SUPABASE_URL o SUPABASE_PUBLISHABLE_KEY");

const orgId = "11111111-1111-4111-8111-111111111111";
const malasanaId = "22222222-2222-4222-8222-222222222221";
const accounts = [
  ["super@cafenorte.es", "superadmin"],
  ["admin@cafenorte.es", "admin"],
  ["malasana@cafenorte.es", "manager"],
  ["empleado@cafenorte.es", "staff"],
];

const clients = {};
const results = {};
for (const [email, role] of accounts) {
  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password: email });
  if (error) throw new Error(`Login ${role}: ${error.message}`);
  clients[role] = client;
  results[`login_${role}`] = "ok";
}

const admin = clients.admin;
const manager = clients.manager;
const staff = clients.staff;

const { data: adminLocations, error: adminLocationsError } = await admin
  .from("locations")
  .select("id")
  .eq("organization_id", orgId);
if (adminLocationsError || adminLocations?.length !== 5)
  throw new Error("El admin no ve las 5 ubicaciones");
results.admin_locations = adminLocations.length;

const { data: managerLocations, error: managerLocationsError } = await manager
  .from("locations")
  .select("id")
  .eq("organization_id", orgId);
if (
  managerLocationsError ||
  managerLocations?.length !== 1 ||
  managerLocations[0].id !== malasanaId
) {
  throw new Error("El responsable de Malasaña no está correctamente aislado");
}
results.manager_locations = managerLocations.length;

const { data: membership, error: membershipError } = await staff
  .from("memberships")
  .select("id,public_id")
  .eq("acquisition_location_id", malasanaId)
  .eq("status", "active")
  .limit(1)
  .single();
if (membershipError) throw membershipError;
results.staff_membership_lookup = "ok";

const { data: walletState, error: walletError } = await staff.rpc("get_wallet_install_state", {
  _membership_public_id: membership.public_id,
  _provider: "apple",
});
if (walletError || walletState?.mode !== "demo" || walletState?.install_url !== null) {
  throw new Error("Wallet no identifica correctamente el modo demo");
}
results.wallet_mode = walletState.mode;

const { data: segments, error: segmentError } = await admin
  .from("customer_segments")
  .select("id")
  .eq("organization_id", orgId)
  .eq("status", "active")
  .limit(1);
if (segmentError || !segments?.length) throw new Error("No hay segmentos activos");
const { data: segmentCount, error: previewError } = await admin.rpc("preview_segment_count", {
  _segment_id: segments[0].id,
});
if (previewError || typeof segmentCount !== "number")
  throw new Error("Falló la previsualización del segmento");
results.segment_preview = segmentCount;

const invalidGift = await staff.rpc("consume_gift_card", {
  _code: "VALIDATION-DOES-NOT-EXIST",
  _location_id: malasanaId,
  _amount_cents: 100,
  _idempotency_key: `read-only-validation-${crypto.randomUUID()}`,
  _note: "Validación sin escritura",
});
if (!invalidGift.error?.message.includes("GIFT_CARD_NOT_AVAILABLE")) {
  throw new Error("El backend de tarjeta regalo no rechazó un código inválido");
}
results.gift_card_validation = "ok";

const posResponse = await fetch(`${url}/functions/v1/pos-operation`, {
  method: "POST",
  headers: {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    "Content-Type": "application/json",
    "x-fideleo-key": "fid_invalid_validation_key",
  },
  body: JSON.stringify({
    external_id: `read-only-validation-${crypto.randomUUID()}`,
    operation_type: "purchase",
    payload: { test: true },
  }),
});
const posBody = await posResponse.json();
if (posResponse.ok || !JSON.stringify(posBody).includes("INVALID_API_KEY")) {
  throw new Error(`El endpoint POS no rechazó una clave inválida: ${JSON.stringify(posBody)}`);
}
results.pos_authentication = "ok";

const forbiddenNotifications = await manager
  .from("notifications")
  .select("id", { count: "exact", head: true });
if (forbiddenNotifications.error || forbiddenNotifications.count !== 0) {
  throw new Error("El manager puede acceder a notificaciones sensibles");
}
results.manager_notifications_visible = forbiddenNotifications.count;

console.log(JSON.stringify(results, null, 2));
