import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  FAVORITES_STORAGE_KEY,
  clearFavoriteIds,
  loadFavoriteIds,
  saveFavoriteIds,
} from "./favorites";

describe("favorites storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("returns an empty array when nothing is stored", () => {
    expect(loadFavoriteIds()).toEqual([]);
  });

  it("round-trips a list of ids", () => {
    saveFavoriteIds(["d2-001", "d2-002"]);
    expect(loadFavoriteIds()).toEqual(["d2-001", "d2-002"]);
  });

  it("ignores non-array stored values", () => {
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, '"not-an-array"');
    expect(loadFavoriteIds()).toEqual([]);
  });

  it("drops non-string entries", () => {
    window.localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify(["d2-001", 42, { bad: true }, "d2-002"]),
    );
    expect(loadFavoriteIds()).toEqual(["d2-001", "d2-002"]);
  });

  it("clearFavoriteIds removes the stored list", () => {
    saveFavoriteIds(["d2-001"]);
    clearFavoriteIds();
    expect(loadFavoriteIds()).toEqual([]);
    expect(window.localStorage.getItem(FAVORITES_STORAGE_KEY)).toBeNull();
  });

  it("survives corrupted JSON", () => {
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, "{not valid json");
    expect(loadFavoriteIds()).toEqual([]);
  });
});
