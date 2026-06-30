import { describe, expect, it } from "vitest";
import { scheduleSessions } from "./scheduleData";
import {
  SHARE_PARAM,
  buildShareUrl,
  decodeFavorites,
  encodeFavorites,
  parseShareParam,
} from "./shareUrl";

describe("shareUrl encoding", () => {
  it("round-trips a subset of saved session IDs", () => {
    const ids = scheduleSessions.slice(0, 5).map((s) => s.id);
    const code = encodeFavorites(ids, scheduleSessions);
    expect(decodeFavorites(code, scheduleSessions)).toEqual(ids);
  });

  it("round-trips the entire schedule", () => {
    const ids = scheduleSessions.map((s) => s.id);
    const code = encodeFavorites(ids, scheduleSessions);
    expect(decodeFavorites(code, scheduleSessions)).toEqual(ids);
  });

  it("emits URL-safe, padding-free base64url", () => {
    const code = encodeFavorites(
      scheduleSessions.slice(0, 3).map((s) => s.id),
      scheduleSessions,
    );
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(code).not.toContain("=");
    expect(code).not.toContain("+");
    expect(code).not.toContain("/");
  });

  it("is compact relative to the session count", () => {
    const code = encodeFavorites(
      scheduleSessions.map((s) => s.id),
      scheduleSessions,
    );
    // bitmask is ~ceil(N/8) bytes -> base64; far smaller than N ids
    expect(code.length).toBeLessThan(scheduleSessions.length);
  });

  it("trims trailing empty bytes instead of emitting default AAAAA suffixes", () => {
    const ids = scheduleSessions.slice(0, 2).map((s) => s.id);
    const code = encodeFavorites(ids, scheduleSessions);
    expect(code).toBe("wA");
    expect(decodeFavorites(code, scheduleSessions)).toEqual(ids);
  });

  it("drops unknown IDs so stale schedule versions degrade gracefully", () => {
    const ids = [scheduleSessions[0].id, "d2-99999"];
    const code = encodeFavorites(ids, scheduleSessions);
    expect(decodeFavorites(code, scheduleSessions)).toEqual([
      scheduleSessions[0].id,
    ]);
  });

  it("decodes invalid / empty codes to an empty list without throwing", () => {
    expect(decodeFavorites("not!valid", scheduleSessions)).toEqual([]);
    expect(decodeFavorites("", scheduleSessions)).toEqual([]);
  });

  it("encodes an empty set to a bitmask that decodes back to empty", () => {
    const code = encodeFavorites([], scheduleSessions);
    expect(code).toBe("");
    expect(decodeFavorites(code, scheduleSessions)).toEqual([]);
  });
});

describe("shareUrl param helpers", () => {
  it("parses the share code from a search string", () => {
    expect(parseShareParam("?s=ABCdef")).toBe("ABCdef");
    expect(parseShareParam("?foo=1&s=xyz")).toBe("xyz");
    expect(parseShareParam("")).toBeNull();
    expect(parseShareParam("?other=1")).toBeNull();
    expect(parseShareParam("?s=")).toBeNull();
  });

  it("buildShareUrl returns empty for no favorites and a ?s= URL otherwise", () => {
    expect(buildShareUrl([], scheduleSessions)).toBe("");
    const ids = scheduleSessions.slice(0, 2).map((s) => s.id);
    const url = buildShareUrl(ids, scheduleSessions);
    expect(url).toContain(`${SHARE_PARAM}=`);
    const code = new URL(url).searchParams.get(SHARE_PARAM);
    expect(code && decodeFavorites(code, scheduleSessions)).toEqual(ids);
  });
});
