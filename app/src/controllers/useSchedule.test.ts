import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useSchedule } from "./useSchedule";
import { isDefaultHiddenTrack } from "../models/session";

describe("useSchedule", () => {
  it("exposes the full schedule and all track/type options", () => {
    const { result } = renderHook(() => useSchedule());
    expect(result.current.allSessions.length).toBeGreaterThan(100);
    expect(result.current.trackOptions.length).toBeGreaterThan(10);
    expect(result.current.typeOptions).toContain("KEYNOTE");
    expect(result.current.typeOptions).toContain("SESSION");
  });

  it("starts with no active filters and all non-leadership day sessions visible", () => {
    const { result } = renderHook(() => useSchedule());
    expect(result.current.hasActiveFilters).toBe(false);
    const daySessionCount = result.current.allSessions.filter(
      (s) => s.day === result.current.day && !isDefaultHiddenTrack(s.track),
    ).length;
    expect(result.current.filtered.length).toBe(daySessionCount);
  });

  it("filters by query", () => {
    const { result } = renderHook(() => useSchedule());
    act(() => {
      result.current.setQuery("keynote");
    });
    expect(result.current.hasActiveFilters).toBe(true);
    expect(result.current.filtered.length).toBeLessThan(result.current.allSessions.length);
  });

  it("toggles a type filter", () => {
    const { result } = renderHook(() => useSchedule());
    act(() => {
      result.current.toggleType("KEYNOTE");
    });
    expect(result.current.filters.types).toEqual(["KEYNOTE"]);
    expect(
      result.current.filtered.every((session) => session.type === "KEYNOTE"),
    ).toBe(true);
    act(() => {
      result.current.toggleType("KEYNOTE");
    });
    expect(result.current.filters.types).toEqual([]);
  });

  it("toggles a track filter and clears tracks independently", () => {
    const { result } = renderHook(() => useSchedule());
    const firstTrack = result.current.trackOptions[0];
    act(() => {
      result.current.toggleTrack(firstTrack);
    });
    expect(result.current.filters.tracks).toEqual([firstTrack]);
    act(() => {
      result.current.clearTracks();
    });
    expect(result.current.filters.tracks).toEqual([]);
  });

  it("clearFilters resets everything", () => {
    const { result } = renderHook(() => useSchedule());
    act(() => {
      result.current.setQuery("agents");
      result.current.toggleType("SESSION");
      result.current.toggleTrack(result.current.trackOptions[0]);
    });
    expect(result.current.hasActiveFilters).toBe(true);
    act(() => {
      result.current.clearFilters();
    });
    expect(result.current.hasActiveFilters).toBe(false);
    const daySessionCount = result.current.allSessions.filter(
      (s) => s.day === result.current.day && !isDefaultHiddenTrack(s.track),
    ).length;
    expect(result.current.filtered.length).toBe(daySessionCount);
  });
});
