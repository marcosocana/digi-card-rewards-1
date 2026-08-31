import { describe, expect, it } from "vitest";
import {
  getHigherSubscriptionPlans,
  getSubscriptionPlan,
  subscriptionPlans,
} from "@/lib/subscription-plans";

describe("subscription plans", () => {
  it("resolves every plan and its location limit", () => {
    expect(getSubscriptionPlan("basic")?.maxLocations).toBe(1);
    expect(getSubscriptionPlan("pro")?.maxLocations).toBe(3);
    expect(getSubscriptionPlan("ultra")?.maxLocations).toBe(15);
    expect(getSubscriptionPlan("unknown")).toBeNull();
  });

  it("only offers actual upgrades", () => {
    expect(getHigherSubscriptionPlans("basic").map(({ code }) => code)).toEqual(["pro", "ultra"]);
    expect(getHigherSubscriptionPlans("pro").map(({ code }) => code)).toEqual(["ultra"]);
    expect(getHigherSubscriptionPlans("ultra")).toEqual([]);
    expect(getHigherSubscriptionPlans(null)).toEqual(subscriptionPlans);
  });
});
