// Adapter that derives the app's schedule from the official open data files.
// sessions.json and speakers.json are committed verbatim in ../data/ (the source
// of truth). This module filters to session days (2-4), computes time-of-day
// minutes, joins track + room, and looks up speaker roles. To update the
// schedule, replace those two JSON files.

import sessionsJsonRaw from "../data/sessions.json?raw";
import speakersJsonRaw from "../data/speakers.json?raw";

export interface Speaker {
  name: string;
  role: string;
  bio: string;
}

export type SessionType = "KEYNOTE" | "SESSION" | "SPONSOR" | "WORKSHOP";

export interface ScheduleSession {
  id: string;
  day: string;
  type: SessionType;
  track: string;
  start: string;
  end: string;
  startMin: number;
  endMin: number;
  tentative: boolean;
  title: string;
  speakers: Speaker[];
  description: string;
}

export interface ScheduleDay {
  key: string;
  shortLabel: string;
  date: string;
}

export const SCHEDULE_DAYS: ScheduleDay[] = [
  { key: "Day 2 — Session Day 1", shortLabel: "Day 2", date: "Tuesday, June 30, 2026" },
  { key: "Day 3 — Session Day 2", shortLabel: "Day 3", date: "Wednesday, July 1, 2026" },
  { key: "Day 4 — Session Day 3", shortLabel: "Day 4", date: "Thursday, July 2, 2026" },
];

export const FAIR_DATES = "June 29 – July 2, 2026";
export const VENUE = "Moscone West, San Francisco, CA";

interface RawSession {
  title: string;
  description?: string;
  day: string;
  time: string;
  room?: string;
  type: string;
  track?: string;
  status?: string;
  speakers: string[];
}

interface RawSpeaker {
  name: string;
  role?: string;
  company?: string;
  bio?: string;
}

interface SessionsFile {
  sessions: RawSession[];
}

interface SpeakersFile {
  speakers: RawSpeaker[];
}

const TIME_PATTERN = /^(\d{1,2}):(\d{2})(am|pm)$/;

function toMinutes(time: string): number {
  const match = TIME_PATTERN.exec(time);
  if (!match) {
    return 0;
  }
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3];
  if (ampm === "pm" && hours !== 12) {
    hours += 12;
  }
  if (ampm === "am" && hours === 12) {
    hours = 0;
  }
  return hours * 60 + minutes;
}

function splitTimeRange(time: string): [string, string] {
  const [start, end] = time.split("-");
  return [start.trim(), end.trim()];
}

function buildTrack(session: RawSession): string {
  const track = (session.track ?? "").trim();
  const room = (session.room ?? "").trim();
  if (track && room && track !== room) {
    return `${track} · ${room}`;
  }
  return track || room;
}

function buildSpeakerRole(speaker: RawSpeaker): string {
  const role = (speaker.role ?? "").trim();
  const company = (speaker.company ?? "").trim();
  if (role && company) {
    return `${role}, ${company}`;
  }
  return role || company;
}

const speakersFile = JSON.parse(speakersJsonRaw) as SpeakersFile;
const sessionsFile = JSON.parse(sessionsJsonRaw) as SessionsFile;

const speakerInfoByName = new Map<string, { role: string; bio: string }>();
for (const speaker of speakersFile.speakers) {
  speakerInfoByName.set(speaker.name, {
    role: buildSpeakerRole(speaker),
    bio: (speaker.bio ?? "").trim(),
  });
}

const sessionDayKeys = new Set(SCHEDULE_DAYS.map((d) => d.key));

function sortRawSessions(a: RawSession, b: RawSession): number {
  const [aStart] = splitTimeRange(a.time);
  const [bStart] = splitTimeRange(b.time);
  const byStart = toMinutes(aStart) - toMinutes(bStart);
  if (byStart !== 0) {
    return byStart;
  }
  const aTrack = buildTrack(a);
  const bTrack = buildTrack(b);
  const byTrack = aTrack.localeCompare(bTrack);
  if (byTrack !== 0) {
    return byTrack;
  }
  return a.title.localeCompare(b.title);
}

export const scheduleSessions: ScheduleSession[] = SCHEDULE_DAYS.flatMap(
  (dayInfo) => {
    const dayNum = dayInfo.key.match(/^Day (\d)/)?.[1] ?? "2";
    return sessionsFile.sessions
      .filter(
        (session) => sessionDayKeys.has(session.day) && session.day === dayInfo.key,
      )
      .sort(sortRawSessions)
      .map((session, index) => {
        const [start, end] = splitTimeRange(session.time);
        return {
          id: `d${dayNum}-${String(index + 1).padStart(3, "0")}`,
          day: session.day,
          type: session.type.toUpperCase() as SessionType,
          track: buildTrack(session),
          start,
          end,
          startMin: toMinutes(start),
          endMin: toMinutes(end),
          tentative: session.status === "tentative",
          title: session.title,
          speakers: session.speakers.map((name) => ({
            name,
            role: speakerInfoByName.get(name)?.role ?? "",
            bio: speakerInfoByName.get(name)?.bio ?? "",
          })),
          description: session.description ?? "",
        };
      });
  },
);
