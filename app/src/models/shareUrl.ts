import {
  decodeSelectionBitmask,
  encodeSelectionBitmask,
} from "../lib/selectionBitmaskUrl";
import { ScheduleSession } from "./session";

// Share-URL encoding for "My Schedule".
//
// The schedule is a fixed, ordered list (`scheduleSessions`), so a saved set of
// sessions is encoded against the session IDs in that canonical order.
//
// Restore is symmetric: decode the bitmask back to session IDs using the same
// canonical order. The schedule is bundled, so sender and receiver share the
// same order.

export const SHARE_PARAM = "s";

function orderedSessionIds(sessions: readonly ScheduleSession[]): string[] {
  return sessions.map((session) => session.id);
}

/** Encode a set of saved session IDs into a compact base64url bitmask. */
export function encodeFavorites(
  ids: string[],
  sessions: ScheduleSession[],
): string {
  return encodeSelectionBitmask(ids, orderedSessionIds(sessions));
}

/** Decode a base64url bitmask back into session IDs (canonical order). */
export function decodeFavorites(
  code: string,
  sessions: ScheduleSession[],
): string[] {
  return decodeSelectionBitmask(code, orderedSessionIds(sessions));
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
  if (code.length === 0) return "";
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
