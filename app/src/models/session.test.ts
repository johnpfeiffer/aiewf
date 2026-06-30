import { describe, expect, it } from "vitest";
import {
  ScheduleSession,
  applyFilters,
  conflictingIds,
  durationLabel,
  findConflicts,
  formatTimeRange,
  groupByTimeSlot,
  matchesQuery,
  sortSessionsByTime,
  sessionsOverlap,
  uniqueTracks,
} from "./session";

function makeSession(overrides: Partial<ScheduleSession> = {}): ScheduleSession {
  return {
    id: "s1",
    type: "SESSION",
    track: "Software Factories · Main Stage",
    start: "9:00am",
    end: "9:30am",
    startMin: 540,
    endMin: 570,
    tentative: false,
    title: "A talk",
    speakers: [{ name: "Jane Doe", role: "CEO, Acme" }],
    description: "A description about agents.",
    ...overrides,
  };
}

describe("durationLabel", () => {
  it("formats minutes-only durations", () => {
    expect(durationLabel(makeSession({ startMin: 540, endMin: 560 }))).toBe("20m");
  });

  it("formats whole-hour durations", () => {
    expect(durationLabel(makeSession({ startMin: 540, endMin: 600 }))).toBe("1h");
  });

  it("formats mixed durations", () => {
    expect(durationLabel(makeSession({ startMin: 540, endMin: 690 }))).toBe("2h 30m");
  });

  it("returns a dash for non-positive durations", () => {
    expect(durationLabel(makeSession({ startMin: 540, endMin: 540 }))).toBe("—");
  });
});

describe("formatTimeRange", () => {
  it("joins start and end with an en dash", () => {
    expect(formatTimeRange(makeSession({ start: "10:00am", end: "10:30am" }))).toBe(
      "10:00am–10:30am",
    );
  });
});

describe("sortSessionsByTime", () => {
  it("sorts by start minute ascending", () => {
    const a = makeSession({ id: "a", startMin: 600 });
    const b = makeSession({ id: "b", startMin: 540 });
    const sorted = sortSessionsByTime([a, b]);
    expect(sorted.map((s) => s.id)).toEqual(["b", "a"]);
  });

  it("breaks ties by type order", () => {
    const keynote = makeSession({ id: "k", type: "KEYNOTE", startMin: 540 });
    const session = makeSession({ id: "s", type: "SESSION", startMin: 540 });
    const sorted = sortSessionsByTime([session, keynote]);
    expect(sorted.map((s) => s.id)).toEqual(["k", "s"]);
  });
});

describe("uniqueTracks", () => {
  it("returns sorted unique tracks", () => {
    const sessions = [
      makeSession({ track: "Vision · Track 2" }),
      makeSession({ track: "Software Factories · Main Stage" }),
      makeSession({ track: "Vision · Track 2" }),
    ];
    expect(uniqueTracks(sessions)).toEqual([
      "Software Factories · Main Stage",
      "Vision · Track 2",
    ]);
  });
});

describe("matchesQuery", () => {
  it("matches case-insensitive title text", () => {
    expect(matchesQuery(makeSession({ title: "Building Agents" }), "AGENTS")).toBe(true);
  });

  it("matches speaker name and role", () => {
    expect(matchesQuery(makeSession(), "acme")).toBe(true);
    expect(matchesQuery(makeSession(), "jane")).toBe(true);
  });

  it("matches track and description", () => {
    expect(matchesQuery(makeSession(), "main stage")).toBe(true);
    expect(matchesQuery(makeSession(), "about agents")).toBe(true);
  });

  it("returns true for empty query", () => {
    expect(matchesQuery(makeSession(), "  ")).toBe(true);
  });

  it("returns false when nothing matches", () => {
    expect(matchesQuery(makeSession(), "quantum")).toBe(false);
  });
});

describe("applyFilters", () => {
  const sessions = [
    makeSession({ id: "a", type: "KEYNOTE", track: "Main Stage", title: "Alpha" }),
    makeSession({ id: "b", type: "SESSION", track: "Vision", title: "Beta" }),
    makeSession({ id: "c", type: "SPONSOR", track: "Vision", title: "Gamma" }),
  ];

  it("filters by type", () => {
    const result = applyFilters(sessions, { query: "", tracks: [], types: ["SESSION"] });
    expect(result.map((s) => s.id)).toEqual(["b"]);
  });

  it("filters by track", () => {
    const result = applyFilters(sessions, { query: "", tracks: ["Vision"], types: [] });
    expect(result.map((s) => s.id)).toEqual(["b", "c"]);
  });

  it("filters by query", () => {
    const result = applyFilters(sessions, { query: "alpha", tracks: [], types: [] });
    expect(result.map((s) => s.id)).toEqual(["a"]);
  });

  it("combines filters with AND", () => {
    const result = applyFilters(sessions, {
      query: "",
      tracks: ["Vision"],
      types: ["SPONSOR"],
    });
    expect(result.map((s) => s.id)).toEqual(["c"]);
  });
});

describe("groupByTimeSlot", () => {
  it("groups sessions sharing a start time", () => {
    const sessions = [
      makeSession({ id: "a", startMin: 540, start: "9:00am" }),
      makeSession({ id: "b", startMin: 540, start: "9:00am" }),
      makeSession({ id: "c", startMin: 600, start: "10:00am" }),
    ];
    const slots = groupByTimeSlot(sessions);
    expect(slots).toHaveLength(2);
    expect(slots[0].startMin).toBe(540);
    expect(slots[0].sessions).toHaveLength(2);
    expect(slots[1].startMin).toBe(600);
  });
});

describe("sessionsOverlap", () => {
  it("detects overlapping ranges", () => {
    const a = makeSession({ startMin: 540, endMin: 600 });
    const b = makeSession({ startMin: 570, endMin: 630 });
    expect(sessionsOverlap(a, b)).toBe(true);
  });

  it("treats touching ranges as non-overlapping", () => {
    const a = makeSession({ startMin: 540, endMin: 600 });
    const b = makeSession({ startMin: 600, endMin: 660 });
    expect(sessionsOverlap(a, b)).toBe(false);
  });
});

describe("findConflicts and conflictingIds", () => {
  it("flags only overlapping favorites", () => {
    const sessions = [
      makeSession({ id: "a", startMin: 540, endMin: 600 }),
      makeSession({ id: "b", startMin: 570, endMin: 630 }),
      makeSession({ id: "c", startMin: 700, endMin: 720 }),
    ];
    const pairs = findConflicts(sessions);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].a.id).toBe("a");
    expect(pairs[0].b.id).toBe("b");

    const ids = conflictingIds(sessions);
    expect([...ids].sort()).toEqual(["a", "b"]);
  });

  it("returns empty when no favorites overlap", () => {
    const sessions = [
      makeSession({ id: "a", startMin: 540, endMin: 600 }),
      makeSession({ id: "c", startMin: 700, endMin: 720 }),
    ];
    expect(findConflicts(sessions)).toHaveLength(0);
    expect(conflictingIds(sessions).size).toBe(0);
  });
});
