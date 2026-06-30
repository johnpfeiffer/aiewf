export const FAVORITES_STORAGE_KEY = "aiewf.day2.favorites";

export function loadFavoriteIds(): string[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return [];
  }
}

export function saveFavoriteIds(ids: string[]): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // ignore quota / privacy mode errors
  }
}

export function clearFavoriteIds(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(FAVORITES_STORAGE_KEY);
  } catch {
    // ignore
  }
}
