import { useCallback, useMemo, useState } from "react";
import {
  ScheduleSession,
  ScheduleDay,
  SessionFilters,
  SessionType,
  SCHEDULE_DAYS,
  applyFilters,
  groupByTimeSlot,
  scheduleSessions,
  uniqueTracks,
  uniqueTypes,
} from "../models/session";

export interface UseSchedule {
  allSessions: ScheduleSession[];
  days: ScheduleDay[];
  day: string;
  setDay: (day: string) => void;
  filters: SessionFilters;
  setQuery: (query: string) => void;
  toggleTrack: (track: string) => void;
  toggleType: (type: SessionType) => void;
  clearTracks: () => void;
  clearFilters: () => void;
  filtered: ScheduleSession[];
  timeSlots: ReturnType<typeof groupByTimeSlot>;
  trackOptions: string[];
  typeOptions: SessionType[];
  hasActiveFilters: boolean;
}

export function useSchedule(): UseSchedule {
  const allSessions = scheduleSessions;
  const days = SCHEDULE_DAYS;

  const [day, setDay] = useState(days[0].key);

  const daySessions = useMemo(
    () => allSessions.filter((s) => s.day === day),
    [allSessions, day],
  );

  const trackOptions = useMemo(() => uniqueTracks(daySessions), [daySessions]);
  const typeOptions = useMemo(() => uniqueTypes(daySessions), [daySessions]);

  const [filters, setFilters] = useState<SessionFilters>({
    query: "",
    tracks: [],
    types: [],
  });

  const setQuery = useCallback((query: string) => {
    setFilters((current) => ({ ...current, query }));
  }, []);

  const toggleTrack = useCallback((track: string) => {
    setFilters((current) => ({
      ...current,
      tracks: current.tracks.includes(track)
        ? current.tracks.filter((value) => value !== track)
        : [...current.tracks, track],
    }));
  }, []);

  const toggleType = useCallback((type: SessionType) => {
    setFilters((current) => ({
      ...current,
      types: current.types.includes(type)
        ? current.types.filter((value) => value !== type)
        : [...current.types, type],
    }));
  }, []);

  const clearTracks = useCallback(() => {
    setFilters((current) => ({ ...current, tracks: [] }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ query: "", tracks: [], types: [] });
  }, []);

  const filtered = useMemo(
    () => applyFilters(daySessions, filters),
    [daySessions, filters],
  );

  const timeSlots = useMemo(() => groupByTimeSlot(filtered), [filtered]);

  const hasActiveFilters =
    filters.query.trim().length > 0 ||
    filters.tracks.length > 0 ||
    filters.types.length > 0;

  return {
    allSessions,
    days,
    day,
    setDay,
    filters,
    setQuery,
    toggleTrack,
    toggleType,
    clearTracks,
    clearFilters,
    filtered,
    timeSlots,
    trackOptions,
    typeOptions,
    hasActiveFilters,
  };
}
