import { supabase } from "@/integrations/supabase/client";
import { errorLabel } from "@/lib/format";

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc(fn, args);
  if (error) throw new Error(errorLabel(error.message));
  return data as T;
}

export interface ScanResult {
  membership_id: string;
  public_id: string;
  balance: number;
  customer_name: string;
  customer_email: string;
  customer_phone?: string | null;
  short_code: string;
  program: {
    id: string;
    name: string;
    earning_mode: string;
    earning_value: number;
    rounding_mode: string;
    allow_earning: boolean;
    allow_redeeming: boolean;
    mechanic_type?: string;
    mechanic_config?: Record<string, number>;
  };
  account?: {
    progress_balance: number;
    lifetime_spend_cents: number;
    visit_count: number;
    stamp_balance: number;
    cashback_balance_cents: number;
    tier: string | null;
  };
  rewards: { id: string; name: string; points_cost: number; available: boolean }[];
  last_transaction: { type: string; points_delta: number; created_at: string } | null;
}

export const searchMemberships = (query: string, locationId: string) =>
  rpc<ScanResult[]>("search_memberships", { _query: query, _location_id: locationId });

export const resolveMembershipQr = (token: string, locationId: string) =>
  rpc<ScanResult>("resolve_membership_qr", { _token: token, _location_id: locationId });

export const recordPurchase = (args: {
  membershipId: string;
  locationId: string;
  amountCents: number;
  ticketReference?: string | null;
  note?: string | null;
  idempotencyKey: string;
}) =>
  rpc<{
    duplicate: boolean;
    transaction_id: string;
    points_awarded: number;
    previous_balance: number;
    resulting_balance: number;
    earned_rewards?: { id: string; name: string }[];
  }>("record_purchase", {
    _membership_id: args.membershipId,
    _location_id: args.locationId,
    _amount_cents: args.amountCents,
    _ticket_reference: args.ticketReference ?? null,
    _note: args.note ?? null,
    _idempotency_key: args.idempotencyKey,
  });

export const redeemReward = (args: {
  membershipId: string;
  rewardId: string;
  locationId: string;
  idempotencyKey: string;
}) =>
  rpc<{
    duplicate: boolean;
    reward_name: string;
    points_spent: number;
    previous_balance: number;
    resulting_balance: number;
  }>("redeem_reward", {
    _membership_id: args.membershipId,
    _reward_id: args.rewardId,
    _location_id: args.locationId,
    _idempotency_key: args.idempotencyKey,
  });

export const adjustPoints = (args: {
  membershipId: string;
  delta: number;
  reason: string;
  note?: string;
}) =>
  rpc<{ previous_balance: number; resulting_balance: number }>("adjust_points", {
    _membership_id: args.membershipId,
    _delta: args.delta,
    _reason: args.reason,
    _note: args.note ?? null,
  });

export const reverseTransaction = (transactionId: string, reason: string) =>
  rpc<{ resulting_balance: number }>("reverse_transaction", {
    _transaction_id: transactionId,
    _reason: reason,
  });

export const requestWalletUpdate = (membershipId: string) =>
  rpc<{ ok: boolean }>("request_wallet_update", { _membership_id: membershipId });

export const syncGoogleWallet = async (membershipId: string) => {
  const { data, error } = await supabase.functions.invoke<{
    synced?: boolean;
    balance?: number;
    reason?: string;
    error?: string;
  }>("sync-google-wallet", { body: { membershipId } });
  if (error) throw new Error(errorLabel(error.message));
  if (data?.error) throw new Error(errorLabel(data.error));
  return data ?? { synced: false, reason: "EMPTY_RESPONSE" };
};

export const redeemCoupon = (membershipId: string, couponCode: string, locationId: string) =>
  rpc<{ title: string; discount_type: string; discount_value: number }>("redeem_coupon", {
    _membership_id: membershipId,
    _coupon_code: couponCode,
    _location_id: locationId,
    _idempotency_key: crypto.randomUUID(),
  });

export const consumeGiftCard = (code: string, locationId: string, amountCents: number) =>
  rpc<{ amount_cents: number; resulting_balance_cents: number }>("consume_gift_card", {
    _code: code,
    _location_id: locationId,
    _amount_cents: amountCents,
    _idempotency_key: crypto.randomUUID(),
  });

export const consumeCashback = (membershipId: string, locationId: string, amountCents: number) =>
  rpc<{ amount_cents: number; resulting_balance_cents: number }>("consume_cashback", {
    _membership_id: membershipId,
    _location_id: locationId,
    _amount_cents: amountCents,
    _idempotency_key: crypto.randomUUID(),
  });

export const getMembershipPortal = (publicId: string) =>
  rpc<PortalData | null>("get_membership_portal", { _public_id: publicId });

export const getWalletInstallState = (publicId: string, provider: "apple" | "google") =>
  rpc<{
    mode: "demo" | "live";
    status: string;
    install_url: string | null;
    web_fallback_url: string;
    message: string;
  }>("get_wallet_install_state", { _membership_public_id: publicId, _provider: provider });

export interface PortalData {
  membership: { public_id: string; balance: number; status: string; joined_at: string };
  customer: { first_name: string; last_name: string | null; email: string };
  organization: { display_name: string; slug: string };
  branding: Record<string, string> | null;
  program: {
    public_name: string;
    description: string | null;
    earning_mode: string;
    earning_value: number;
    mechanic_type?: string;
    mechanic_config?: Record<string, number>;
    terms: string | null;
  };
  account?: {
    progress_balance: number;
    lifetime_spend_cents: number;
    visit_count: number;
    stamp_balance: number;
    cashback_balance_cents: number;
    tier: string | null;
  } | null;
  short_code: string | null;
  rewards: {
    id: string;
    name: string;
    description: string | null;
    points_cost: number;
    available: boolean;
  }[];
  earned_rewards?: {
    id: string;
    name: string;
    status: string;
    awarded_at: string;
    expires_at: string | null;
  }[];
  locations: { name: string; address_line: string | null; city: string | null }[];
  history: {
    id: string;
    type: string;
    points_delta: number;
    amount_cents: number | null;
    note: string | null;
    created_at: string;
  }[];
  passes: {
    provider: string;
    status: string;
    is_sandbox: boolean;
    last_updated_at: string | null;
  }[];
}
