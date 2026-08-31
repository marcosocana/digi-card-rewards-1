import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  adminScopeEvent,
  getSelectedLocationIds,
  getSelectedOrganizationId,
  getSelectedScopeLevel,
  locationFilterEvent,
  setSelectedAdminScope,
  setSelectedLocationIds,
} from "@/lib/session";

describe("admin scope persistence", () => {
  beforeEach(() => window.localStorage.clear());

  it("recovers safely from invalid stored location filters", () => {
    window.localStorage.setItem("fideleo:selected-locations", "not-json");
    expect(getSelectedLocationIds()).toEqual([]);
  });

  it("stores location filters and announces the change", () => {
    const listener = vi.fn();
    window.addEventListener(locationFilterEvent, listener);
    setSelectedLocationIds(["location-1", "location-2"]);
    expect(getSelectedLocationIds()).toEqual(["location-1", "location-2"]);
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener(locationFilterEvent, listener);
  });

  it("stores a complete organization scope and dispatches one scope event", () => {
    const listener = vi.fn();
    window.addEventListener(adminScopeEvent, listener);
    setSelectedAdminScope("organization", "org-1", ["location-1"]);
    expect(getSelectedScopeLevel()).toBe("organization");
    expect(getSelectedOrganizationId()).toBe("org-1");
    expect(getSelectedLocationIds()).toEqual(["location-1"]);
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener(adminScopeEvent, listener);
  });
});
