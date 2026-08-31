import { describe, expect, it } from "vitest";
import { getCaptureUrl, getPublicAppOrigin } from "@/lib/public-url";

describe("public capture URLs", () => {
  it("always points public QR codes at the production origin", () => {
    expect(getPublicAppOrigin()).toBe("https://fideleo.store");
    expect(getCaptureUrl("cafe-norte")).toBe("https://fideleo.store/unirme/cafe-norte");
  });

  it("encodes organization and location slugs", () => {
    expect(getCaptureUrl("Café Norte", "Madrid Centro")).toBe(
      "https://fideleo.store/unirme/Caf%C3%A9%20Norte/Madrid%20Centro",
    );
  });
});
