// Loopcraft — single source of truth.
// Ported from the original Loopcraft site (loopcraft.swyxio.workers.dev/loops.js)
// so the nested-boxes, while-loop ladder, human-life, stress-curve and summit
// views all render from the same data.
//
// LOOPS are ordered INNER (1) -> OUTER (6).

export type LoopKey = "token" | "chat" | "agent" | "goal" | "meta" | "open";

export type NodeCls = "mono" | "ghost" | "ok" | "bad" | "cursor";

export interface LoopNode {
  label: string;
  cls?: NodeCls;
  /** separator rendered before this node ("→" or "/") */
  sep?: string;
}

export interface HumanLoop {
  name: string;
  verbs: string;
  exit: string;
  story: string;
  multi?: boolean;
}

export interface Loop {
  n: number;
  key: LoopKey;
  name: string;
  verbs: string;
  exit: string;
  timescale: string;
  color: string;
  bg: string;
  /** ladder view */
  cond: string;
  not: boolean;
  tick: string;
  note: string;
  body?: string;
  tag?: string;
  /** nested-boxes view */
  sub?: string;
  nodes?: LoopNode[];
  /** human-life view */
  human: HumanLoop;
}

export interface SummaryPill {
  label: string;
  color: LoopKey;
  caption?: string;
}

export interface SummitCard {
  eyebrow: string;
  name: string;
  color: string;
  code: string[];
  foot: string;
}

export interface SummitFinale {
  finale: true;
  title: string;
  punch: string;
  wink: string;
}

export type SummitStep = SummitCard | SummitFinale | SummitIntro;

export interface SummitIntro {
  kicker: string;
  line: string;
  ask: string;
}

export interface CurveStep {
  src: string;
  heading: string;
  caption: string;
}

export type SectionKey = "intro" | "nested" | "ladder" | "human" | "curves" | "summit";

export interface SectionMeta {
  key: SectionKey;
  label: string;
  heading: string;
  total: number;
}

// --- titles ---------------------------------------------------------------
export const LOOPS_TITLE = "Loopcraft: The Art of Stacking Loops";
export const HUMAN_TITLE = "The same loops, lived as a human life";
export const SUMMIT_TITLE = "So… what is the highest loop?";
export const SUMMIT_GOLD = "#b8860b";

// --- top-of-page summary pills -------------------------------------------
// The 5-T arc of AI's evolution.
export const SUMMARY: SummaryPill[] = [
  { label: "Tokens", color: "token" },
  { label: "Turns", color: "chat" },
  { label: "Tools", color: "agent", caption: '= "the agent loop"' },
  { label: "Tasks", color: "goal" },
  { label: "Automations", color: "meta" },
];

// Human single-word arc, parallel to the 5-T arc above.
export const HUMAN_SUMMARY: SummaryPill[] = [
  { label: "Pulse", color: "token" },
  { label: "Talk", color: "chat" },
  { label: "Tools", color: "agent" },
  { label: "Work", color: "goal" },
  { label: "Tribe", color: "meta", caption: "multi-agent" },
  { label: "Civilization", color: "open", caption: "across generations" },
];

// --- the finale -----------------------------------------------------------
export const SUMMIT: SummitStep[] = [
  {
    kicker: "every loop is the body of a bigger loop",
    line: "Tokens nest in turns, turns in tools, tools in tasks, tasks in automations, automations in software factories…",
    ask: "…and software factories nest inside the people who build them. Where do those people loop?",
  },
  {
    eyebrow: "loop 7 · ≈ a year",
    name: "the AI Engineer Summit",
    color: "#8a8472",
    code: [
      "while not AGI:",
      "    gather(the_builders)",
      "    compare_notes(); compete(); collaborate()",
      '    sleep(1, "year")',
    ],
    foot: "the annual loop where loops 1–6 finally meet their makers · ~everyone in this room",
  },
  {
    eyebrow: "loop ∞ · the summit of summits",
    name: "the AI Engineer World's Fair",
    color: SUMMIT_GOLD,
    code: ["while curiosity():", "    host(every_other_summit)"],
    foot: "the loop whose iterations are the summits themselves · exit: none",
  },
  {
    finale: true,
    title: "The Highest Loop",
    punch: "every loop you just saw runs inside this one.",
    wink: "and right now, so do you. welcome to the World's Fair.",
  },
];

// --- the six loops --------------------------------------------------------
export const LOOPS: Loop[] = [
  {
    n: 1,
    key: "token",
    name: "token loop",
    verbs: "sample, append, repeat",
    exit: "stop token",
    timescale: "≈ seconds",
    color: "#d2691e",
    bg: "#fdeee2",
    cond: "stop_token()",
    not: true,
    tick: "ms",
    note: "predict the next token — the whole engine",
    body: "emit(next_token)",
    human: {
      name: "heartbeats",
      verbs: "beat, breathe, repeat",
      exit: "involuntary — runs until you die",
      story: "It starts as a pump that never asks permission. The smallest involuntary tick — and the whole engine of a life.",
    },
    nodes: [
      { label: "the" },
      { label: "cat" },
      { label: "sat" },
      { label: "", cls: "cursor" },
    ],
  },
  {
    n: 2,
    key: "chat",
    name: "chat loop",
    verbs: "prompt, respond, align",
    exit: "helpful reply",
    timescale: "≈ a turn",
    sub: "= RLHF · the ChatGPT moment — humans rank replies, the model learns to please",
    color: "#2a8fbd",
    bg: "#e7f4fb",
    cond: "user_satisfied()",
    not: true,
    tick: "seconds",
    note: "RLHF wraps it in turns · the ChatGPT moment",
    human: {
      name: "learning to talk",
      verbs: "babble, get corrected, align",
      exit: "made yourself understood",
      story: "Babble, get a 👍 or 👎 from caregivers, adjust. RLHF for toddlers — you learn to be understood, and to please.",
    },
    nodes: [
      { label: "user: “explain recursion”" },
      { label: "assistant: draft reply", sep: "→" },
      { label: "human: 👎", cls: "bad", sep: "→" },
      { label: "human: 👍", cls: "ok", sep: "/" },
      { label: "aligned reply ✓", cls: "ok", sep: "→" },
    ],
  },
  {
    n: 3,
    key: "agent",
    name: "agent turn",
    verbs: "call tool, feed result",
    exit: "no more tool calls",
    timescale: "≈ minutes",
    color: "#2e9e6b",
    bg: "#e9f6ef",
    cond: "has_tool_calls()",
    not: false,
    tick: "minutes",
    note: "tools + results feedback · “the agent loop”",
    human: {
      name: "using tools",
      verbs: "grab, fumble, master",
      exit: "the tool obeys",
      story: "The first real agent loop: pick up a spoon, a pencil, a keyboard — act, watch what happens, try again until the world obeys your hands.",
    },
    nodes: [
      { label: "read_file()", cls: "mono" },
      { label: "→ 240 lines", cls: "ghost", sep: "→" },
      { label: "run_tests()", cls: "mono", sep: "→" },
      { label: "→ 3 passed", cls: "ghost", sep: "→" },
    ],
  },
  {
    n: 4,
    key: "goal",
    name: "/goal loop",
    verbs: "run, judge, retry",
    exit: "goal reached",
    timescale: "≈ hours",
    color: "#d6456f",
    bg: "#fdeef2",
    cond: "goal_reached()",
    not: true,
    tick: "hours",
    tag: "/goal",
    note: "a judge retries until the goal is met",
    human: {
      name: "the work loop",
      verbs: "eat, sleep, code, repeat",
      exit: "shipped it",
      story: "Eat, sleep, code, repeat. The daily grind: pursue a goal, judge the result, retry tomorrow. Still mostly a loop you run alone.",
    },
    nodes: [
      { label: "agent result" },
      { label: "judge: off-goal ×", cls: "bad", sep: "→" },
      { label: "agent result", sep: "→" },
      { label: "judge: goal met ✓", cls: "ok", sep: "→" },
    ],
  },
  {
    n: 5,
    key: "meta",
    name: "automations",
    verbs: "cron, subagents, multi-agent",
    exit: "collaboration and competition",
    timescale: "≈ days",
    color: "#7b5cd6",
    bg: "#f3f0fc",
    cond: "consensus()",
    not: true,
    tick: "days",
    note: "cron + subagents fan one agent into many",
    human: {
      name: "the tribe loop",
      verbs: "team up, raise, delegate, let go",
      exit: "they run their own loops",
      multi: true,
      story: "You stop running loops and start making loopers — a family, a team, a company. Cron becomes habit; subagents become children, mentees, hires. Increasingly multi-agent.",
    },
  },
  {
    n: 6,
    key: "open",
    name: "software factories ??????",
    verbs: "set goals, allocate, cull",
    exit: "none. open exploration",
    timescale: "∞",
    color: "#8a8472",
    bg: "#f6f4ec",
    cond: "??????()",
    not: false,
    tick: "????",
    note: "agents spawning agents · no exit",
    human: {
      name: "the civilization loop",
      verbs: "build, pass on, repeat",
      exit: "none — the torch passes on",
      multi: true,
      story: "The loop nobody closes alone. Allocate a finite life, build things larger than yourself, hand them down. Most multi-agent of all — it runs across generations.",
    },
  },
];

// --- stress-curve steps ---------------------------------------------------
const CURVES_BASE = "/loopcraft/curves/";
export const CURVE_STEPS: CurveStep[] = [
  { src: `${CURVES_BASE}stress-2023.png`, heading: "AIEWF Stress Level Index", caption: "2023 — the index begins" },
  { src: `${CURVES_BASE}stress-2024.png`, heading: "AIEWF Stress Level Index", caption: "+ 2024 — note the axis rescaling" },
  { src: `${CURVES_BASE}stress-2025.png`, heading: "AIEWF Stress Level Index", caption: "+ 2025" },
  { src: `${CURVES_BASE}stress-2026.png`, heading: "AIEWF Stress Level Index", caption: "+ 2026 — stress compounds every year" },
  { src: `${CURVES_BASE}lorenz.png`, heading: "Sales-pace Lorenz curves", caption: "outlier-cleaned · Gini rising 0.04 → 0.71" },
];
export const SHOT_SRC = "/loopcraft/shot.jpeg";
export const SUMMIT_HREF = "https://ai.engineer/wf";

// --- sections -------------------------------------------------------------
export const SECTIONS: SectionMeta[] = [
  { key: "intro", label: "Title", heading: "The Highest Loop", total: 1 },
  { key: "nested", label: "Nested loops", heading: LOOPS_TITLE, total: LOOPS.length },
  { key: "ladder", label: "While-loop ladder", heading: LOOPS_TITLE, total: LOOPS.length },
  { key: "human", label: "Human life", heading: HUMAN_TITLE, total: LOOPS.length },
  { key: "curves", label: "Stress curves", heading: "AIEWF Stress Level Index", total: CURVE_STEPS.length },
  { key: "summit", label: "The highest loop", heading: SUMMIT_TITLE, total: SUMMIT.length },
];

export const SECTION_TOTAL: Record<SectionKey, number> = SECTIONS.reduce(
  (acc, s) => {
    acc[s.key] = s.total;
    return acc;
  },
  {} as Record<SectionKey, number>,
);

// --- helpers --------------------------------------------------------------
export const loopByKey = (key: LoopKey): Loop | undefined =>
  LOOPS.find((l) => l.key === key);

export const colorOf = (key: LoopKey): string =>
  loopByKey(key)?.color ?? "#888";

export const bgOf = (key: LoopKey): string =>
  loopByKey(key)?.bg ?? "#fff";

export const nOf = (key: LoopKey): number =>
  loopByKey(key)?.n ?? 99;

/** arc used by the summit view: the AI arc + Software Factories */
export const SUMMIT_ARC: SummaryPill[] = [
  ...SUMMARY,
  { label: "Software Factories", color: "open" },
];
