import { describe, expect, it } from "vitest";
import { cleanDisplayName, NAME_MAX } from "./displayName";

describe("cleanDisplayName", () => {
  it("trims and collapses whitespace", () => {
    expect(cleanDisplayName("  Kai   Pla  ")).toBe("Kai Pla");
  });
  it("keeps accents and emoji", () => {
    expect(cleanDisplayName("Núria 💪")).toBe("Núria 💪");
  });
  it("strips control characters and newlines", () => {
    expect(cleanDisplayName("Kai\n\tPla\u0000")).toBe("Kai Pla");
  });
  it("rejects empty, blank, too long and non-strings", () => {
    expect(cleanDisplayName("")).toBeNull();
    expect(cleanDisplayName("   ")).toBeNull();
    expect(cleanDisplayName("x".repeat(NAME_MAX + 1))).toBeNull();
    expect(cleanDisplayName(undefined)).toBeNull();
    expect(cleanDisplayName(42)).toBeNull();
  });
  it("accepts exactly the maximum length", () => {
    expect(cleanDisplayName("x".repeat(NAME_MAX))).toBe("x".repeat(NAME_MAX));
  });
});
