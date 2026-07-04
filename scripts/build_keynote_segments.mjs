import fs from "node:fs";

const schedulePath = "app/src/data/sessions.json";
const appLinksPath = "app/src/data/video-links-for-sessions.json";

const schedule = JSON.parse(fs.readFileSync(schedulePath, "utf8"));

const sessionID = (session) => {
  if (session.session_id) {
    return session.session_id;
  }
  throw new Error(`Missing canonical session_id for ${session.day} ${session.time} ${session.title}`);
};

const secondsFromHHMMSS = (hhmmss) => {
  const [h, m, s] = hhmmss.split(":").map(Number);
  return h * 3600 + m * 60 + s;
};

const secondsFromMarker = (marker) => {
  const parts = marker.split(":").map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
};

const timeMarker = (hhmmss) => {
  const [h, m, s] = hhmmss.split(":").map(Number);
  if (h === 0) {
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

const isTimestamp = (line) => /^\d{1,2}:\d{2}(?::\d{2})?$/.test(line.trim());
const isAccessibleTime = (line) =>
  /^\d+ (?:hour|minute|second)s?(?:, \d+ (?:hour|minute|second)s?)*$/.test(line.trim());

const configs = [
  {
    transcriptPath: "app/src/data/keynotes-day2.txt",
    outPath: "app/src/data/keynote_segments_day2.json",
    scheduleDay: "Day 2 — Session Day 1",
    videoID: "htM02KMNZnk",
    fallbackEnd: "08:33:41",
    mappings: [
      {
        toc: "Swyx - Welcome & Intro to Software Factories",
        schedule: "The Highest Loop",
        confidence: 0.9,
        notes: "Matched by speaker/topic; schedule title differs from transcript TOC.",
      },
      {
        toc: "Pablo Castro (Microsoft) - On AI and Knowledge",
        schedule: "On AI and Knowledge",
        confidence: 0.98,
        notes: "Exact title match.",
      },
      {
        toc: "Alexander Emiricos & Roman Huitt (OpenAI) - Empowering Engineers & The Codex App",
        schedule: "The Golden Age of AI Engineering",
        confidence: 0.82,
        notes: "Matched by speakers and schedule position; transcript TOC title differs.",
      },
      {
        toc: "Zishan Lee (Z.ai) - GLM 5.2 Keynote",
        schedule: "GLM-5.2: Frontier Intelligence, Open Weights.",
        confidence: 0.9,
        notes: "Matched by speaker/company and GLM topic; transcript spelling differs from schedule.",
      },
      {
        toc: "Thomas Wolf (Hugging Face) & Olive (MiniMax) - M3 Model & Multimodality",
        schedule: "Thom Wolf keynote",
        confidence: 0.86,
        notes: "Matched by speaker and schedule position; transcript TOC has richer topic.",
      },
      {
        toc: "Randall Degges (Snyk) - AI Security Track Intro",
        schedule: "Security Track intro",
        confidence: 0.72,
        notes: "Matched by topic and position; schedule speaker metadata differs.",
      },
      {
        toc: "Jack (Human Layer) - Harness Engineering is Not Enough",
        schedule: "Harness Engineering is not Enough: Why Software Factories Fail",
        confidence: 0.75,
        notes: "Matched by near-exact title and schedule position; speaker metadata differs.",
      },
      {
        toc: "Eric Meyer (Linet's Labs) - Provably Safe Agentic Compute (Lean Verification)",
        schedule: "In Code They Act, In Proof We Trust",
        confidence: 0.86,
        notes: "Matched by speaker and verification topic; transcript TOC title differs.",
      },
      {
        toc: "Lee Robinson (Cursor) - Recursive Model Improvement",
        schedule: "Recursive Model Improvement",
        confidence: 0.98,
        notes: "Exact title match.",
      },
    ],
  },
  {
    transcriptPath: "app/src/data/keynotes-day3.txt",
    outPath: "app/src/data/keynote_segments_day3.json",
    scheduleDay: "Day 3 — Session Day 2",
    videoID: "4sX_He5c4sI",
    fallbackEnd: "08:47:18",
    mappings: [
      {
        toc: "Thariq Shihipar - Field Guide to Fable",
        schedule: "Field Guide to Fable",
        confidence: 0.98,
        notes: "Matched by title and speaker.",
      },
      {
        toc: "Tariq Shaukat - In the Land of AI Agents, the Verifiers Are King",
        schedule: "In the Land of AI Agents, the Verifiers Are King",
        confidence: 0.98,
        notes: "Matched by title and speaker.",
      },
      {
        toc: "Antje Barth - Perception Agents",
        schedule: "Perception Agents",
        confidence: 0.95,
        notes: "Matched by title and schedule position; transcript misrecognizes the speaker name.",
      },
      {
        toc: "Benoit Schillings - Research to Reality with Google DeepMind",
        schedule: "Research to Reality with Google DeepMind",
        confidence: 0.98,
        notes: "Matched by title and speaker.",
      },
      {
        toc: "Laurie Voss & Aparna Dhinakaran - Evals Track Intro",
        schedule: "Evals Track Intro",
        confidence: 0.94,
        notes: "Matched by title and speaker.",
      },
      {
        toc: "Richard Socher - First Steps Toward Automated AI Research",
        schedule: "First Steps Toward Automated AI Research",
        confidence: 0.9,
        notes: "Matched by title and schedule position.",
      },
      {
        toc: "Han Xiao - Autoresearch for Dense Retrieval",
        schedule: "Autoresearch for Dense Retrieval: Test-Time Compute with Frozen Embedding Models",
        confidence: 0.92,
        notes: "Matched by speaker and shortened transcript TOC title.",
      },
      {
        toc: "Stefania Druga - Memory Harnesses for Long-Running Research Agents",
        schedule: "Memory Harnesses for Long-Running Research Agents",
        confidence: 0.98,
        notes: "Matched by title and speaker.",
      },
      {
        toc: "Elie Bakouch - the era of (auto) research",
        schedule: "« the era of (auto) research »",
        confidence: 0.95,
        notes: "Matched by speaker and title wording.",
      },
      {
        toc: "Tim Sweeney - Closing the Loop: An Autonomous AI Research Agent",
        schedule: "Closing the Loop: An Autonomous AI Research Agent",
        confidence: 0.98,
        notes: "Matched by title and speaker.",
      },
      {
        toc: "Zhengyao Jiang - An AI Agent Became the #1 Contributor in OpenAI's Hiring Challenge",
        schedule: "An AI Agent Became the #1 Contributor in OpenAI's Hiring Challenge",
        confidence: 0.96,
        notes: "Matched by title and speaker; transcript begins near the topic statement.",
      },
      {
        toc: "Lakshya Agrawal - Self-Improvement of Context, Harness, and Model Weights through Reflective Optimization",
        schedule: "Self-Improvement of Context, Harness, and Model Weights through Reflective Optimization",
        confidence: 0.98,
        notes: "Matched by title and speaker.",
      },
      {
        toc: "Tejas Bhakta - Autoresearch for Kernels",
        schedule: "Autoresearch for Kernels",
        confidence: 0.95,
        notes: "Matched by title and schedule position; transcript approximates the speaker name.",
      },
      {
        toc: "Roland Gavrilescu & Julian Bright - Autoresearch in the Wild",
        schedule: "Autoresearch in the wild",
        confidence: 0.95,
        notes: "Matched by title and speakers.",
      },
      {
        toc: "Erina Karati & Arunachalam Manikandan - Autoresearch in a Multi-Agent AI Village",
        schedule: "Autoresearch in a Multi-Agent AI Village",
        confidence: 0.92,
        notes: "Matched by title and schedule position; transcript misrecognizes the speaker name.",
      },
      {
        toc: "Addy Osmani - Closing Keynote",
        schedule: "Closing Keynote",
        time: "4:30pm-4:50pm",
        confidence: 0.95,
        notes: "Matched by speaker and schedule position.",
      },
      {
        toc: "George Cameron & Micah Hill-Smith - Trends in AI",
        schedule: "Trends in AI",
        confidence: 0.98,
        notes: "Matched by title and speakers.",
      },
      {
        toc: "Wei-Lin Chiang - Closing Keynote",
        schedule: "Closing Keynote",
        time: "5:10pm-5:30pm",
        confidence: 0.92,
        notes: "Matched by speaker and schedule position.",
      },
    ],
  },
  {
    transcriptPath: "app/src/data/keynotes-day4.txt",
    outPath: "app/src/data/keynote_segments_day4.json",
    scheduleDay: "Day 4 — Session Day 3",
    videoID: "I2cbIws9j10",
    fallbackEnd: "09:09:28",
    mappings: [
      {
        toc: "Barr Yaron - The 2026 State of AI Engineering",
        schedule: "The 2026 State of AI Engineering",
        confidence: 0.98,
        notes: "Matched by title and speaker.",
      },
      {
        toc: "John Ousterhout - TCP and RDMA are Killing Inference Throughput; Homa can Fix It",
        schedule: "TCP and RDMA are Killing Inference Throughput; Homa can Fix It",
        confidence: 0.98,
        notes: "Matched by title and speaker.",
      },
      {
        toc: "Maxime Rivest & Isaac Miller - The Unreasonable Effectiveness of Separating the Task from the Model",
        schedule: "The Unreasonable Effectiveness of Separating the Task from the Model",
        confidence: 0.98,
        notes: "Matched by title and speakers.",
      },
      {
        toc: "Mike Krieger & swyx - How Anthropic Builds: Lessons from Labs",
        schedule: "How Anthropic Builds: Lessons from Labs",
        confidence: 0.95,
        notes: "Matched by title and speakers.",
      },
      {
        toc: "Emil Eifrem - Thinner Agents on a Smarter Substrate",
        schedule: "Thinner Agents on a Smarter Substrate: The Ontology-based Semantic Layer",
        confidence: 0.92,
        notes: "Matched by speaker and shortened transcript TOC title.",
      },
      {
        toc: "Katelyn Lesse & Angela Jiang - Tokens Should Have Jobs",
        schedule: "Tokens Should Have Jobs",
        confidence: 0.98,
        notes: "Matched by title and speakers.",
      },
      {
        toc: "Nikita Kothari - MCPs, CLIs, and Skills",
        schedule: "MCPs, CLIs, and Skills: Choosing the Right Tooling Layer for Agentic Development",
        confidence: 0.92,
        notes: "Matched by speaker and shortened transcript TOC title.",
      },
      {
        toc: "Michael Grinich - Auth for Agents: Unblock Autonomous AI with auth.md",
        schedule: "Auth for Agents: Unblock Autonomous AI with auth.md",
        confidence: 0.98,
        notes: "Matched by title and speaker.",
      },
      {
        toc: "Mike Chambers - Harness Engineering",
        schedule: "Harness Engineering: Building the Production Cage for Powerful Domain Agents",
        confidence: 0.9,
        notes: "Matched by speaker and shortened transcript TOC title.",
      },
      {
        toc: "Brendan Rappazzo - Loophole",
        schedule: "Loophole - Adversarial Agents To Stress Test Your Morality",
        confidence: 0.9,
        notes: "Matched by speaker and shortened transcript TOC title.",
      },
      {
        toc: "Giselle van Dongen - Every step you take, every call you make",
        schedule: "🎵 Every step you take, every call you make - the reliable agent stack",
        confidence: 0.9,
        notes: "Matched by speaker and shortened transcript TOC title.",
      },
      {
        toc: "Sarah Sanders - We let an AI agent execute Bash and lived to talk about it",
        schedule: "We let an AI agent execute Bash and lived to talk about it",
        confidence: 0.98,
        notes: "Matched by title and speaker.",
      },
      {
        toc: "Kay Malcolm - No Memory, No Harness",
        schedule: "No Memory, No Harness: Why the Database Is the Last Line of Defense",
        confidence: 0.9,
        notes: "Matched by speaker and shortened transcript TOC title.",
      },
      {
        toc: "Andrew Qu - How we Solved Agent Building",
        schedule: "How we Solved Agent Building",
        confidence: 0.98,
        notes: "Matched by title and speaker.",
      },
      {
        toc: "Philipp Schmid - Agents Without Code",
        schedule: "Agents Without Code: How Skills, YAML, and Filesystems Replaced Python",
        confidence: 0.9,
        notes: "Matched by speaker and shortened transcript TOC title.",
      },
      {
        toc: "Theo Browne - Closing Keynote",
        schedule: "Closing Keynote — Theo Browne",
        confidence: 0.95,
        notes: "Matched by speaker and schedule position.",
      },
      {
        toc: "Garry Tan - Closing Keynote",
        schedule: "Closing Keynote: Garry Tan",
        confidence: 0.95,
        notes: "Matched by speaker and schedule position.",
      },
      {
        toc: "Startup Battlefield",
        schedule: "Startup Battlefield",
        confidence: 0.86,
        notes: "Matched by title; transcript also has a preceding Howie Liu intro at 08:19:24.",
      },
    ],
  },
];

const buildSegments = (config) => {
  const raw = fs.readFileSync(config.transcriptPath, "utf8");
  const lines = raw.split(/\r?\n/);
  const divider = lines.findIndex((line) => line.trim() === "---");
  if (divider < 0) {
    throw new Error(`Missing transcript divider in ${config.transcriptPath}`);
  }

  const tocLines = lines.slice(0, divider);
  const transcriptLines = lines.slice(divider + 1);
  const toc = tocLines
    .map((line) => {
      const match = line.match(/^(\d{2}:\d{2}:\d{2}) - (.+)$/);
      return match ? { start: match[1], title: match[2] } : null;
    })
    .filter(Boolean);

  for (let i = 0; i < toc.length; i += 1) {
    toc[i].end = toc[i + 1]?.start || config.fallbackEnd;
  }

  const scheduleSessions = schedule.sessions.filter(
    (session) => session.day === config.scheduleDay && session.room === "Main Stage",
  );

  const timestampLines = transcriptLines
    .map((line, index) => ({ line: line.trim(), index }))
    .filter(({ line }) => /^\d{1,2}:\d{2}(?::\d{2})?$/.test(line))
    .map(({ line, index }) => ({ seconds: secondsFromMarker(line), index }));

  const markerIndex = (hhmmss, fallbackStart = false) => {
    const marker = timeMarker(hhmmss);
    const index = transcriptLines.findIndex((line) => line.trim() === marker);
    if (index >= 0) {
      return index;
    }
    const targetSeconds = secondsFromHHMMSS(hhmmss);
    const nearest = timestampLines.find(({ seconds }) => seconds >= targetSeconds);
    if (nearest) {
      return nearest.index;
    }
    return fallbackStart ? 0 : -1;
  };

  const segmentText = (entry, entryIndex) => {
    let startIndex = markerIndex(entry.start, entryIndex === 1);
    const endIndex = markerIndex(entry.end);
    if (startIndex < 0) {
      startIndex = 0;
    }
    const start = startIndex === 0 && entryIndex === 1 ? 0 : startIndex + 2;
    const end = endIndex >= 0 ? endIndex : transcriptLines.length;
    return transcriptLines
      .slice(start, end)
      .map((line) => line.trim())
      .filter((line) => line && !isTimestamp(line) && !isAccessibleTime(line))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  };

  return config.mappings.map((mapping) => {
    const entryIndex = toc.findIndex((entry) => entry.title === mapping.toc);
    if (entryIndex < 0) {
      throw new Error(`Missing TOC in ${config.transcriptPath}: ${mapping.toc}`);
    }
    const entry = toc[entryIndex];
    const matchingSessions = scheduleSessions.filter(
      (session) =>
        session.title === mapping.schedule && (!mapping.time || session.time === mapping.time),
    );
    if (matchingSessions.length !== 1) {
      throw new Error(
        `Expected one schedule match for ${config.scheduleDay}: ${mapping.schedule} ${
          mapping.time || ""
        }, found ${matchingSessions.length}`,
      );
    }
    const session = matchingSessions[0];
    if (!session) {
      throw new Error(`Missing schedule title for ${config.scheduleDay}: ${mapping.schedule}`);
    }
    return {
      session_id: sessionID(session),
      title: session.title,
      speaker_names: session.speakers || [],
      start: entry.start,
      end: entry.end,
      transcript: segmentText(entry, entryIndex),
      extracted_summary: "",
      confidence: mapping.confidence,
      match_notes: mapping.notes,
    };
  });
};

const allLinks = [];

for (const config of configs) {
  const segments = buildSegments(config);
  fs.writeFileSync(
    config.outPath,
    `${JSON.stringify({ source: config.transcriptPath, segments }, null, 2)}\n`,
  );
  for (const segment of segments) {
    allLinks.push({
      session_id: segment.session_id,
      video_url: `https://www.youtube.com/watch?v=${config.videoID}&t=${secondsFromHHMMSS(segment.start)}s`,
    });
  }
  console.log(`wrote ${config.outPath} with ${segments.length} segments`);
}

fs.writeFileSync(
  appLinksPath,
  `${JSON.stringify(
    {
      source: configs.map((config) => config.outPath),
      links: allLinks,
    },
    null,
    2,
  )}\n`,
);
console.log(`wrote ${appLinksPath} with ${allLinks.length} links`);
