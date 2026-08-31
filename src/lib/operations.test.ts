import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), invoke: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: mocks.rpc, functions: { invoke: mocks.invoke } },
}));

import { adjustPoints, recordPurchase, redeemReward, syncGoogleWallet } from "@/lib/operations";

describe("front-end operation contracts", () => {
  beforeEach(() => {
    mocks.rpc.mockReset();
    mocks.invoke.mockReset();
  });

  it("sends the complete purchase contract to Supabase", async () => {
    mocks.rpc.mockResolvedValue({ data: { resulting_balance: 20 }, error: null });
    await recordPurchase({
      membershipId: "member-1",
      locationId: "location-1",
      amountCents: 1299,
      idempotencyKey: "purchase-1",
    });
    expect(mocks.rpc).toHaveBeenCalledWith("record_purchase", {
      _membership_id: "member-1",
      _location_id: "location-1",
      _amount_cents: 1299,
      _ticket_reference: null,
      _note: null,
      _idempotency_key: "purchase-1",
    });
  });

  it("sends reward and point adjustment arguments without losing values", async () => {
    mocks.rpc.mockResolvedValue({ data: {}, error: null });
    await redeemReward({
      membershipId: "member-1",
      rewardId: "reward-1",
      locationId: "location-1",
      idempotencyKey: "redeem-1",
    });
    expect(mocks.rpc).toHaveBeenLastCalledWith("redeem_reward", {
      _membership_id: "member-1",
      _reward_id: "reward-1",
      _location_id: "location-1",
      _idempotency_key: "redeem-1",
    });

    await adjustPoints({ membershipId: "member-1", delta: 12.6, reason: "manual" });
    expect(mocks.rpc).toHaveBeenLastCalledWith("adjust_points", {
      _membership_id: "member-1",
      _delta: 12.6,
      _reason: "manual",
      _note: null,
    });
  });

  it("translates known RPC errors for the interface", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "INSUFFICIENT_POINTS" } });
    await expect(
      redeemReward({
        membershipId: "member-1",
        rewardId: "reward-1",
        locationId: "location-1",
        idempotencyKey: "redeem-1",
      }),
    ).rejects.toThrow("Saldo insuficiente para esta recompensa.");
  });

  it("surfaces errors returned inside the Wallet function payload", async () => {
    mocks.invoke.mockResolvedValue({ data: { error: "MEMBERSHIP_NOT_FOUND" }, error: null });
    await expect(syncGoogleWallet("member-1")).rejects.toThrow("No se encontró la membresía.");
  });
});
