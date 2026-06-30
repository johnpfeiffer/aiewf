import {
  ScheduleSession,
  SessionType,
  scheduleSessions,
} from "./scheduleData";

export {
  type ScheduleSession,
  type Speaker,
  type SessionType,
  scheduleSessions,
  DAY_LABEL,
  DAY_DATE,
  VENUE,
} from "./scheduleData";

export interface SessionFilters {
  query: string;
  tracks: string[];
  types: SessionType[];
}

export const TYPE_ORDER: SessionType[] = [
  "KEYNOTE",
  "SESSION",
  "SPONSOR",
];

export const TYPE_LABEL: Record<SessionType, string> = {
  KEYNOTE: "Keynote",
  SESSION: "Session",
  SPONSOR: "Sponsor",
};

export function durationMinutes(session: ScheduleSession): number {
  return session.endMin - session.startMin;
}

export function durationLabel(session: ScheduleSession): string {
  const minutes = durationMinutes(session);
  if (minutes <= 0) {
    return "—";
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours <= 0) {
    return `${mins}m`;
  }
  if (mins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${mins}m`;
}

export function formatTimeRange(session: ScheduleSession): string {
  return `${session.start}–${session.end}`;
}

export function sortSessionsByTime(
  sessions: ScheduleSession[],
): ScheduleSession[] {
  return [...sessions].sort((a, b) => {
    if (a.startMin !== b.startMin) {
      return a.startMin - b.startMin;
    }
    return TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type);
  });
}

export function uniqueTracks(sessions: ScheduleSession[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const session of sessions) {
    if (!seen.has(session.track)) {
      seen.add(session.track);
      ordered.push(session.track);
    }
  }
  return ordered.sort((a, b) => a.localeCompare(b));
}

export function uniqueTypes(sessions: ScheduleSession[]): SessionType[] {
  const present = new Set<SessionType>();
  for (const session of sessions) {
    present.add(session.type);
  }
  return TYPE_ORDER.filter((type) => present.has(type));
}

export function matchesQuery(
  session: ScheduleSession,
  query: string,
): boolean {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) {
    return true;
  }
  if (session.title.toLowerCase().includes(needle)) {
    return true;
  }
  if (session.track.toLowerCase().includes(needle)) {
    return true;
  }
  if (session.description.toLowerCase().includes(needle)) {
    return true;
  }
  for (const speaker of session.speakers) {
    if (speaker.name.toLowerCase().includes(needle)) {
      return true;
    }
    if (speaker.role.toLowerCase().includes(needle)) {
      return true;
    }
  }
  return false;
}

export function applyFilters(
  sessions: ScheduleSession[],
  filters: SessionFilters,
): ScheduleSession[] {
  return sortSessionsByTime(
    sessions.filter((session) => {
      if (filters.tracks.length > 0 && !filters.tracks.includes(session.track)) {
        return false;
      }
      if (filters.types.length > 0 && !filters.types.includes(session.type)) {
        return false;
      }
      if (!matchesQuery(session, filters.query)) {
        return false;
      }
      return true;
    }),
  );
}

export interface TimeSlot {
  startMin: number;
  startLabel: string;
  sessions: ScheduleSession[];
}

export function groupByTimeSlot(
  sessions: ScheduleSession[],
): TimeSlot[] {
  const sorted = sortSessionsByTime(sessions);
  const slots: TimeSlot[] = [];
  let current: TimeSlot | null = null;
  for (const session of sorted) {
    if (current && current.startMin === session.startMin) {
      current.sessions.push(session);
    } else {
      current = {
        startMin: session.startMin,
        startLabel: session.start,
        sessions: [session],
      };
      slots.push(current);
    }
  }
  return slots;
}

export function sessionsOverlap(
  a: ScheduleSession,
  b: ScheduleSession,
): boolean {
  return a.startMin < b.endMin && b.startMin < a.endMin;
}

export interface ConflictPair {
  a: ScheduleSession;
  b: ScheduleSession;
}

export function findConflicts(
  sessions: ScheduleSession[],
): ConflictPair[] {
  const sorted = sortSessionsByTime(sessions);
  const pairs: ConflictPair[] = [];
  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i + 1; j < sorted.length; j += 1) {
      const left = sorted[i];
      const right = sorted[j];
      if (right.startMin >= left.endMin) {
        break;
      }
      pairs.push({ a: left, b: right });
    }
  }
  return pairs;
}

export function conflictingIds(sessions: ScheduleSession[]): Set<string> {
  const ids = new Set<string>();
  for (const pair of findConflicts(sessions)) {
    ids.add(pair.a.id);
    ids.add(pair.b.id);
  }
  return ids;
}

export function sessionsById(
  sessions: ScheduleSession[],
): Map<string, ScheduleSession> {
  return new Map(sessions.map((session) => [session.id, session]));
}
