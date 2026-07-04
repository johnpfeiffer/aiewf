import { describe, expect, it } from "vitest";
import {
  CURVE_STEPS,
  HUMAN_SUMMARY,
  LOOPS,
  SECTION_TOTAL,
  SECTIONS,
  SHOT_SRC,
  SUMMIT,
  SUMMIT_ARC,
  SUMMARY,
  bgOf,
  colorOf,
  loopByKey,
  nOf,
} from "./loopcraft";

describe("loopcraft data", () => {
  it("has six loops ordered inner (1) -> outer (6)", () => {
    expect(LOOPS).toHaveLength(6);
    expect(LOOPS.map((l) => l.n)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(LOOPS.map((l) => l.key)).toEqual([
      "token",
      "chat",
      "agent",
      "goal",
      "meta",
      "open",
    ]);
  });

  it("every loop carries the fields both views need", () => {
    for (const L of LOOPS) {
      expect(typeof L.name).toBe("string");
      expect(typeof L.cond).toBe("string");
      expect(typeof L.note).toBe("string");
      expect(L.color).toMatch(/^#/);
      expect(L.bg).toMatch(/^#/);
      expect(L.human).toBeTruthy();
      expect(typeof L.human.name).toBe("string");
      expect(typeof L.human.story).toBe("string");
    }
  });

  it("only the token loop carries a body line", () => {
    const withBody = LOOPS.filter((l) => l.body);
    expect(withBody).toHaveLength(1);
    expect(withBody[0].key).toBe("token");
    expect(withBody[0].body).toBe("emit(next_token)");
  });

  it("helpers resolve colors / backgrounds / numbers by key", () => {
    expect(colorOf("token")).toBe("#d2691e");
    expect(bgOf("token")).toBe("#fdeee2");
    expect(nOf("chat")).toBe(2);
    expect(loopByKey("open")?.name).toBe("software factories ??????");
    expect(colorOf("meta")).toBe("#7b5cd6");
  });
});

describe("loopcraft summary arcs", () => {
  it("exposes the 5-T AI arc and the 6-step human arc", () => {
    expect(SUMMARY.map((s) => s.label)).toEqual([
      "Tokens",
      "Turns",
      "Tools",
      "Tasks",
      "Automations",
    ]);
    expect(HUMAN_SUMMARY.map((s) => s.label)).toEqual([
      "Pulse",
      "Talk",
      "Tools",
      "Work",
      "Tribe",
      "Civilization",
    ]);
    expect(HUMAN_SUMMARY.find((s) => s.label === "Tribe")?.caption).toBe(
      "multi-agent",
    );
  });

  it("summit arc is the AI arc plus Software Factories", () => {
    expect(SUMMIT_ARC.map((s) => s.label)).toEqual([
      ...SUMMARY.map((s) => s.label),
      "Software Factories",
    ]);
    expect(SUMMIT_ARC[SUMMIT_ARC.length - 1].color).toBe("open");
  });
});

describe("loopcraft summit + curves + sections", () => {
  it("has four summit steps (intro, summit, world's fair, finale)", () => {
    expect(SUMMIT).toHaveLength(4);
    expect("ask" in SUMMIT[0]).toBe(true);
    expect("eyebrow" in SUMMIT[1]).toBe(true);
    expect("finale" in SUMMIT[3]).toBe(true);
  });

  it("has five stress-curve steps pointing at the bundled images", () => {
    expect(CURVE_STEPS).toHaveLength(5);
    for (const s of CURVE_STEPS) {
      expect(s.src.startsWith("loopcraft/curves/")).toBe(true);
    }
    expect(SHOT_SRC).toBe("loopcraft/shot.jpeg");
  });

  it("defines section totals that match the data", () => {
    expect(SECTION_TOTAL.nested).toBe(6);
    expect(SECTION_TOTAL.ladder).toBe(6);
    expect(SECTION_TOTAL.human).toBe(6);
    expect(SECTION_TOTAL.curves).toBe(5);
    expect(SECTION_TOTAL.summit).toBe(4);
    expect(SECTION_TOTAL.intro).toBe(1);
    expect(SECTIONS.map((s) => s.key)).toEqual([
      "intro",
      "nested",
      "ladder",
      "human",
      "curves",
      "summit",
    ]);
  });
});
