import { describe, expect, it } from "vitest";
import { computePoints, errorLabel, parseAmountToCents, ruleText } from "@/lib/format";

describe("money and loyalty formatting", () => {
  it.each([
    ["10", 1000],
    ["10,50", 1050],
    [" 1 234,56 ", 123456],
    ["0.01", 1],
  ])("parses %s into cents", (value, expected) => {
    expect(parseAmountToCents(value)).toBe(expected);
  });

  it.each(["", "abc", "-1", "1.234", "1,2,3", "10€"])("rejects invalid amount %s", (value) => {
    expect(parseAmountToCents(value)).toBeNull();
  });

  it("computes points using both supported accumulation rules", () => {
    expect(computePoints(1250, "points_per_currency_unit", 2, "floor")).toBe(25);
    expect(computePoints(1250, "currency_units_per_point", 5, "floor")).toBe(2);
    expect(computePoints(1299, "currency_units_per_point", 5, "nearest")).toBe(3);
  });

  it("renders readable rules and known backend errors", () => {
    expect(ruleText("points_per_currency_unit", 1)).toBe("1 € = 1 punto");
    expect(ruleText("points_per_currency_unit", 10)).toBe("1 € = 10 puntos");
    expect(errorLabel("RPC failed: INSUFFICIENT_POINTS")).toBe(
      "Saldo insuficiente para esta recompensa.",
    );
    expect(errorLabel("UNKNOWN_ERROR")).toBe("UNKNOWN_ERROR");
  });
});
