// Adapter that derives the app's schedule from the official open data files.
// sessions.json and speakers.json are committed verbatim in ../data/ (the source
// of truth). This module filters to session days (2-4), computes time-of-day
// minutes, joins track + room, and looks up speaker roles. To update the
// schedule, replace those two JSON files.

import sessionsJsonRaw from "../data/sessions.json?raw";
import speakersJsonRaw from "../data/speakers.json?raw";
import sessionVideoLinksRaw from "../data/session-video-links.json?raw";

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
  videoUrl?: string;
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

interface SessionVideoLink {
  session_id: string;
  video_url: string;
}

interface SessionVideoLinksFile {
  links: SessionVideoLink[];
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

function stableSourceSessionId(session: RawSession): string {
  const base = [session.day, session.time, session.room ?? "", session.title].join(" ");
  return `${slug(base, 72)}_${sha1Hex(base).slice(0, 8)}`;
}

function slug(value: string, maxLen: number): string {
  let out = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!out) {
    out = "session";
  }
  if (out.length > maxLen) {
    out = out.slice(0, maxLen).replace(/_+$/g, "");
  }
  return out;
}

function sha1Hex(value: string): string {
  function rotateLeft(n: number, bits: number): number {
    return (n << bits) | (n >>> (32 - bits));
  }

  const bytes = new TextEncoder().encode(value);
  const bitLength = bytes.length * 8;
  const withPadding = new Uint8Array((((bytes.length + 9 + 63) >> 6) << 6));
  withPadding.set(bytes);
  withPadding[bytes.length] = 0x80;
  for (let i = 0; i < 8; i += 1) {
    withPadding[withPadding.length - 1 - i] = i < 4 ? (bitLength >>> (i * 8)) & 0xff : 0;
  }

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  for (let offset = 0; offset < withPadding.length; offset += 64) {
    const words = new Array<number>(80).fill(0);
    for (let i = 0; i < 16; i += 1) {
      const base = offset + i * 4;
      words[i] =
        (withPadding[base] << 24) |
        (withPadding[base + 1] << 16) |
        (withPadding[base + 2] << 8) |
        withPadding[base + 3];
    }
    for (let i = 16; i < 80; i += 1) {
      words[i] = rotateLeft(words[i - 3] ^ words[i - 8] ^ words[i - 14] ^ words[i - 16], 1);
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;

    for (let i = 0; i < 80; i += 1) {
      let f = 0;
      let k = 0;
      if (i < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (i < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }
      const temp = (rotateLeft(a, 5) + f + e + k + words[i]) | 0;
      e = d;
      d = c;
      c = rotateLeft(b, 30);
      b = a;
      a = temp;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
  }

  return [h0, h1, h2, h3, h4]
    .map((word) => (word >>> 0).toString(16).padStart(8, "0"))
    .join("");
}

const speakersFile = JSON.parse(speakersJsonRaw) as SpeakersFile;
const sessionsFile = JSON.parse(sessionsJsonRaw) as SessionsFile;
const sessionVideoLinksFile = JSON.parse(sessionVideoLinksRaw) as SessionVideoLinksFile;

const speakerInfoByName = new Map<string, { role: string; bio: string }>();
for (const speaker of speakersFile.speakers) {
  speakerInfoByName.set(speaker.name, {
    role: buildSpeakerRole(speaker),
    bio: (speaker.bio ?? "").trim(),
  });
}

const sessionDayKeys = new Set(SCHEDULE_DAYS.map((d) => d.key));
const videoUrlBySourceSessionId = new Map(
  sessionVideoLinksFile.links.map((link) => [link.session_id, link.video_url]),
);

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
        const sourceSessionId = stableSourceSessionId(session);
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
          videoUrl: videoUrlBySourceSessionId.get(sourceSessionId),
        };
      });
  },
);
