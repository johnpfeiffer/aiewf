// Adapter that derives the app's schedule from the official open data files.
// sessions.json and speakers.json are committed verbatim in ../data/ (the source
// of truth). This module filters to Day 2, computes time-of-day minutes, joins
// track + room, and looks up speaker roles. To update the schedule, replace
// those two JSON files.

import sessionsJsonRaw from "../data/sessions.json?raw";
import speakersJsonRaw from "../data/speakers.json?raw";

export interface Speaker {
  name: string;
  role: string;
}

export type SessionType = "KEYNOTE" | "SESSION" | "SPONSOR" | "WORKSHOP";

export interface ScheduleSession {
  id: string;
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

export const DAY_LABEL = "Day 2 — Session Day 1";
export const DAY_DATE = "Tuesday, June 30, 2026";
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

const speakerRoleByName = new Map<string, string>();
for (const speaker of speakersFile.speakers) {
  speakerRoleByName.set(speaker.name, buildSpeakerRole(speaker));
}

const day2Sessions = sessionsFile.sessions
  .filter((session) => session.day.startsWith("Day 2"))
  .sort((a, b) => {
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
  });

export const scheduleSessions: ScheduleSession[] = day2Sessions.map(
  (session, index) => {
    const [start, end] = splitTimeRange(session.time);
    return {
      id: `d2-${String(index + 1).padStart(3, "0")}`,
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
        role: speakerRoleByName.get(name) ?? "",
      })),
      description: session.description ?? "",
    };
  },
);
