import { ScheduleSession } from "./session";

// Share-URL encoding for "My Schedule".
//
// The schedule is a fixed, ordered list (`scheduleSessions`), so a saved set of
// sessions is encoded as a bitmask: one bit per session in that canonical
// order. The bitmask is packed into bytes (MSB-first) and base64url-encoded so
// it is safe in a query parameter with no padding. For ~100+ Day-2 sessions
// the code is ~20 characters regardless of how many are starred.
//
// Restore is symmetric: decode the bitmask back to session IDs using the same
// canonical order. The schedule is bundled, so sender and receiver share the
// same order.

export const SHARE_PARAM = "s";

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlToBytes(input: string): Uint8Array | null {
  try {
    const padded =
      input.length % 4 === 2
        ? "=="
        : input.length % 4 === 3
          ? "="
          : "";
    const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + padded;
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

/** Encode a set of saved session IDs into a compact base64url bitmask. */
export function encodeFavorites(
  ids: string[],
  sessions: ScheduleSession[],
): string {
  const indexById = new Map(sessions.map((session, i) => [session.id, i]));
  const bytes = new Uint8Array(Math.ceil(sessions.length / 8));
  for (const id of ids) {
    const i = indexById.get(id);
    if (i === undefined) continue; // unknown id (stale schedule version) is dropped
    const byte = i >> 3;
    const bit = 7 - (i & 7); // MSB-first within each byte
    bytes[byte] |= 1 << bit;
  }
  return bytesToBase64Url(bytes);
}

/** Decode a base64url bitmask back into session IDs (canonical order). */
export function decodeFavorites(
  code: string,
  sessions: ScheduleSession[],
): string[] {
  const bytes = base64UrlToBytes(code);
  if (!bytes) return [];
  const ids: string[] = [];
  for (let i = 0; i < sessions.length; i++) {
    const byte = i >> 3;
    const bit = 7 - (i & 7);
    if (bytes[byte] & (1 << bit)) {
      ids.push(sessions[i].id);
    }
  }
  return ids;
}

/** Read the share code from a search string (e.g. "?s=..."), or null. */
export function parseShareParam(search: string): string | null {
  const code = new URLSearchParams(search).get(SHARE_PARAM);
  return code && code.length > 0 ? code : null;
}

/** Read the share code from the current browser URL, or null. */
export function readShareParam(): string | null {
  if (typeof window === "undefined") return null;
  return parseShareParam(window.location.search);
}

/** Build a full shareable URL carrying the given saved session IDs. */
export function buildShareUrl(
  ids: string[],
  sessions: ScheduleSession[],
): string {
  if (ids.length === 0) return "";
  const code = encodeFavorites(ids, sessions);
  if (typeof window === "undefined") {
    return `?${SHARE_PARAM}=${code}`;
  }
  const url = new URL(window.location.href);
  url.hash = "";
  url.search = "";
  url.searchParams.set(SHARE_PARAM, code);
  return url.toString();
}

/**
 * Copy a URL to the clipboard. Returns true on success, false if the
 * Clipboard API is unavailable or rejects. Kept in the model so it can be
 * substituted in tests.
 */
export async function copyShareUrl(url: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}
