// Compact URL-safe encoding for a selected subset of a canonical ordered list.
//
// The sender and receiver must use the same ordered list. Selected items are
// represented as a bitmask in that order, packed MSB-first, trimmed of trailing
// empty bytes, and encoded as unpadded base64url.

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
    if (input.length % 4 === 1) return null;
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

/** Encode selected values against a canonical ordered list. */
export function encodeSelectionBitmask<T>(
  selectedValues: readonly T[],
  orderedValues: readonly T[],
): string {
  const indexByValue = new Map(orderedValues.map((value, i) => [value, i]));
  const bytes = new Uint8Array(Math.ceil(orderedValues.length / 8));
  for (const value of selectedValues) {
    const i = indexByValue.get(value);
    if (i === undefined) continue;
    const byte = i >> 3;
    const bit = 7 - (i & 7);
    bytes[byte] |= 1 << bit;
  }

  let length = bytes.length;
  while (length > 0 && bytes[length - 1] === 0) {
    length--;
  }
  return bytesToBase64Url(bytes.slice(0, length));
}

/** Decode a selection bitmask against the same canonical ordered list. */
export function decodeSelectionBitmask<T>(
  code: string,
  orderedValues: readonly T[],
): T[] {
  const bytes = base64UrlToBytes(code);
  if (!bytes) return [];

  const selectedValues: T[] = [];
  for (let i = 0; i < orderedValues.length; i++) {
    const byte = i >> 3;
    const bit = 7 - (i & 7);
    if (bytes[byte] & (1 << bit)) {
      selectedValues.push(orderedValues[i]);
    }
  }
  return selectedValues;
}
