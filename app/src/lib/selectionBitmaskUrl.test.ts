import { describe, expect, it } from "vitest";
import {
  decodeSelectionBitmask,
  encodeSelectionBitmask,
} from "./selectionBitmaskUrl";

describe("selectionBitmaskUrl", () => {
  const orderedValues = ["alpha", "bravo", "charlie", "delta", "echo"];

  it("round-trips selected values in canonical order", () => {
    const code = encodeSelectionBitmask(
      ["delta", "alpha", "charlie"],
      orderedValues,
    );

    expect(decodeSelectionBitmask(code, orderedValues)).toEqual([
      "alpha",
      "charlie",
      "delta",
    ]);
  });

  it("emits URL-safe, padding-free base64url", () => {
    const code = encodeSelectionBitmask(["alpha", "bravo"], orderedValues);

    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(code).not.toContain("=");
    expect(code).not.toContain("+");
    expect(code).not.toContain("/");
  });

  it("trims trailing empty bytes and uses an empty code for empty selections", () => {
    expect(encodeSelectionBitmask(["alpha", "bravo"], orderedValues)).toBe(
      "wA",
    );
    expect(encodeSelectionBitmask([], orderedValues)).toBe("");
  });

  it("drops selected values that are not in the ordered list", () => {
    const code = encodeSelectionBitmask(["alpha", "stale"], orderedValues);

    expect(decodeSelectionBitmask(code, orderedValues)).toEqual(["alpha"]);
  });

  it("decodes invalid or empty codes to an empty selection", () => {
    expect(decodeSelectionBitmask("not!valid", orderedValues)).toEqual([]);
    expect(decodeSelectionBitmask("", orderedValues)).toEqual([]);
  });
});
