import crypto from "node:crypto";
import fs from "node:fs";

const sessionsPath = "app/src/data/sessions.json";
const asnPath = "app/src/data/asn-sessions.json";

const source = JSON.parse(fs.readFileSync(sessionsPath, "utf8"));
const asn = JSON.parse(fs.readFileSync(asnPath, "utf8"));

const slug = (value, maxLen = 72) => {
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
};

const derivedSessionID = (session) => {
  const base = [session.day, session.time, session.room ?? "", session.title].join(" ");
  return `${slug(base)}_${crypto.createHash("sha1").update(base).digest("hex").slice(0, 8)}`;
};

const normalize = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/×/g, "x")
    .replace(/\s+/g, " ");

const key = (session, fields) => fields.map((field) => normalize(session[field])).join("\t");

const indexes = [
  ["day", "time", "room", "title"],
  ["day", "time", "title"],
];

const asnIndexes = indexes.map((fields) => {
  const index = new Map();
  const duplicates = new Set();
  for (const session of asn.sessions) {
    const k = key(session, fields);
    if (index.has(k)) {
      duplicates.add(k);
    }
    index.set(k, session);
  }
  return { fields, index, duplicates };
});

const matchSession = (session) => {
  for (const { fields, index, duplicates } of asnIndexes) {
    const k = key(session, fields);
    if (duplicates.has(k)) {
      continue;
    }
    const match = index.get(k);
    if (match) {
      return match;
    }
  }
  return null;
};

let matched = 0;
const unmatched = [];
const used = new Set();

source.totalSessions = source.sessions.length;
source.sessions = source.sessions.map((session) => {
  const match = matchSession(session);
  const derived = derivedSessionID(session);
  if (!match) {
    unmatched.push(session);
    return {
      ...session,
      session_id: session.session_id || session.id || derived,
      source_ids: {
        derived,
      },
    };
  }

  matched += 1;
  used.add(match.sessionId);
  return {
    ...session,
    session_id: match.sessionId,
    source_ids: {
      asn: match.sessionId,
      derived,
    },
  };
});

fs.writeFileSync(sessionsPath, `${JSON.stringify(source, null, 2)}\n`);

console.log(
  `wrote ${sessionsPath}: ${matched}/${source.sessions.length} sessions matched to ASN ids`,
);
if (unmatched.length > 0) {
  console.log("unmatched sessions:");
  for (const session of unmatched) {
    console.log(`- ${session.day} ${session.time} ${session.room}: ${session.title}`);
  }
}
console.log(`${asn.sessions.length - used.size} ASN sessions not represented in sessions.json`);
