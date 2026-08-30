import { describe, expect, it } from "vitest";
import { formatMoney, moneyToInputValue, parseMoneyToInt } from "@/lib/money";

describe("parseMoneyToInt", () => {
  it("parses a dot-decimal value into scaled integer cents", () => {
    expect(parseMoneyToInt("12.5")).toBe(125000);
  });

  it("accepts a comma as the decimal separator", () => {
    expect(parseMoneyToInt("12,5")).toBe(125000);
  });

  it("parses a plain integer", () => {
    expect(parseMoneyToInt("10")).toBe(100000);
  });

  it("rejects empty input", () => {
    expect(parseMoneyToInt("")).toBeNull();
    expect(parseMoneyToInt("   ")).toBeNull();
  });

  it("rejects non-numeric input", () => {
    expect(parseMoneyToInt("abc")).toBeNull();
  });

  it("rejects negative values", () => {
    expect(parseMoneyToInt("-5")).toBeNull();
  });

  it("accepts zero", () => {
    expect(parseMoneyToInt("0")).toBe(0);
  });
});

describe("formatMoney", () => {
  it("formats a scaled integer back to a Polish-locale decimal string", () => {
    expect(formatMoney(125000)).toBe("12,50");
  });

  it("formats zero", () => {
    expect(formatMoney(0)).toBe("0,00");
  });
});

describe("moneyToInputValue", () => {
  it("produces a plain decimal string with no locale grouping", () => {
    expect(moneyToInputValue(125000)).toBe("12.5");
  });

  it("drops trailing zeros", () => {
    expect(moneyToInputValue(100000)).toBe("10");
  });
});
