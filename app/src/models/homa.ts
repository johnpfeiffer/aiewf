// Homa transport simulation — pure, deterministic, step-able core.
//
// Models one receiver, N senders, a TOR switch with a small fixed number of
// priority queues, unscheduled + scheduled (grant-driven) transmission, SRPT
// priority assignment, controlled overcommitment, preemption lag, and optional
// loss/RESEND. The whole thing is a pure function of (state, config) so it is
// trivially testable and replayable: same seed => same trace.
//
// See requirements-homa.md for the full spec. This file implements the engine;
// the React view lives in views/Homa.tsx.

export type PacketKind = "DATA" | "GRANT" | "RESEND" | "BUSY";
export type Workload = "tiny" | "mixed" | "heavytail";

export type Scene =
  | "tcp-vs-homa"
  | "blind-send"
  | "priority-queues"
  | "overcommitment"
  | "preemption"
  | "incast"
  | "failure";

export interface WorkloadSpec {
  key: Workload;
  label: string;
  hint: string;
}

export const WORKLOADS: WorkloadSpec[] = [
  { key: "tiny", label: "Tiny-message heavy", hint: "most RPCs are 1-2 packets" },
  { key: "mixed", label: "Mixed", hint: "uniform short to medium" },
  { key: "heavytail", label: "Heavy-tail", hint: "many small, a few very large" },
];

export interface SceneSpec {
  key: Scene;
  label: string;
  blurb: string;
  stub: boolean;
}

export const SCENES: SceneSpec[] = [
  {
    key: "tcp-vs-homa",
    label: "TCP vs Homa",
    blurb: "Same workload, two transports. TCP pays connection setup and fair-shares the link; Homa sends blindly and serves the shortest message first.",
    stub: false,
  },
  {
    key: "blind-send",
    label: "Blind send + grant",
    blurb: "A message flies out as RTTbytes of unscheduled data, then waits for GRANTs before the scheduled remainder can follow.",
    stub: false,
  },
  {
    key: "priority-queues",
    label: "Priority queues",
    blurb: "Smaller remaining messages get higher priority and bypass queued packets from larger ones at the TOR.",
    stub: false,
  },
  {
    key: "overcommitment",
    label: "Overcommitment lab",
    blurb: "Vary how many RPCs the receiver grants at once. More overcommitment fills the link but allows buffering.",
    stub: false,
  },
  {
    key: "preemption",
    label: "Preemption lag lab",
    blurb: "A shorter RPC arrives mid-flight. Homa drops the scheduled priority of the longer one, but grants already in the air still land — that gap is preemption lag.",
    stub: true,
  },
  {
    key: "incast",
    label: "Incast lab",
    blurb: "Many senders reply at once. Smaller unscheduled limits plus grants cap the queue buildup at the receiver.",
    stub: true,
  },
  {
    key: "failure",
    label: "Failure lab",
    blurb: "Inject packet loss or a stalled sender and watch RESEND/BUSY and receiver-side loss detection.",
    stub: true,
  },
];

export interface HomaConfig {
  senderCount: number;
  rttBytes: number;
  priorityLevels: number;
  overcommitment: number;
  mtu: number;
  /** downlink serialization rate, bytes per ms */
  bandwidth: number;
  /** one-way propagation delay, ms */
  oneWayDelay: number;
  /** sim time advanced per step */
  tickMs: number;
  workload: Workload;
  incastFanIn: number;
  packetSpray: boolean;
  /** 0..1, only active when faultLoss is true */
  lossRate: number;
  faultLoss: boolean;
  faultDelayedSender: string | null;
  faultMissingGrant: boolean;
}

export const DEFAULT_CONFIG: HomaConfig = {
  senderCount: 5,
  rttBytes: 1500,
  priorityLevels: 8,
  overcommitment: 2,
  mtu: 1500,
  bandwidth: 1500,
  oneWayDelay: 5,
  tickMs: 1,
  workload: "mixed",
  incastFanIn: 8,
  packetSpray: false,
  lossRate: 0.2,
  faultLoss: false,
  faultDelayedSender: null,
  faultMissingGrant: false,
};

/** outstanding grants per RPC before the receiver holds back */
export const GRANT_WINDOW = 2;
/** ms the receiver waits for a granted range before issuing RESEND */
export const RESEND_TIMEOUT = 30;

// --- pure RNG -------------------------------------------------------------
// Deterministic, state-as-integer so the whole sim is replayable from a seed.

export function nextRand(state: number): [number, number] {
  let a = state >>> 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, a];
}

/** Map a uniform value in [0,1) to a message size in bytes for a workload. */
export function sampleWorkload(w: Workload, u: number): number {
  const mtu = 1500;
  switch (w) {
    case "tiny":
      // 85% are 1-2 packets; 15% are 3-20 packets.
      return u < 0.85
        ? Math.max(mtu, Math.round((1 + (u / 0.85)) * mtu))
        : Math.round((3 + ((u - 0.85) / 0.15) * 17) * mtu);
    case "heavytail":
      // 80% are 1-3 packets; 20% are 10-100 packets.
      return u < 0.8
        ? Math.max(mtu, Math.round((1 + (u / 0.8) * 2) * mtu))
        : Math.round((10 + ((u - 0.8) / 0.2) * 90) * mtu);
    case "mixed":
    default:
      // uniform 1-12 packets.
      return Math.max(mtu, Math.round((1 + u * 11) * mtu));
  }
}

export interface Arrival {
  at: number;
  senderId: string;
  size: number;
}

/** Build a sorted arrival schedule from a seed. */
export function buildArrivals(
  cfg: HomaConfig,
  seed: number,
  count = 50,
  meanGap = 2.5,
): { arrivals: Arrival[]; rngState: number } {
  const arrivals: Arrival[] = [];
  let st = seed >>> 0;
  let t = 0;
  for (let i = 0; i < count; i++) {
    const [uSender, s1] = nextRand(st);
    st = s1;
    const [uSize, s2] = nextRand(st);
    st = s2;
    const [uGap, s3] = nextRand(st);
    st = s3;
    const senderId = `s${Math.floor(uSender * cfg.senderCount)}`;
    const size = sampleWorkload(cfg.workload, uSize);
    arrivals.push({ at: Math.round(t), senderId, size });
    t += Math.max(0.2, -Math.log(1 - uGap) * meanGap);
  }
  arrivals.sort((a, b) => a.at - b.at);
  return { arrivals, rngState: st };
}

// --- entities -------------------------------------------------------------

export interface Rpc {
  id: number;
  senderId: string;
  totalBytes: number;
  unscheduledBytes: number;
  scheduledBytes: number;
  /** bytes the sender has put on the downlink wire */
  bytesSent: number;
  /** bytes that have arrived at the receiver */
  bytesReceived: number;
  unscheduledSent: boolean;
  /** count of GRANT packets issued for this RPC */
  grantsIssued: number;
  /** count of scheduled DATA packets that have arrived at the receiver */
  scheduledDataArrived: number;
  /** currently assigned scheduled priority (-1 = none / waiting) */
  priority: number;
  createdAt: number;
  completedAt: number | null;
  /** receiver has seen at least one packet for this RPC */
  announced: boolean;
  resendPending: boolean;
  lastProgressAt: number;
}

export interface Packet {
  id: number;
  kind: PacketKind;
  rpcId: number;
  from: string;
  to: string;
  bytes: number;
  priority: number;
  sentAt: number;
  /** absolute time the current phase completes */
  arrivesAt: number;
  /** 0 toSwitch, 1 queued at TOR, 2 toReceiver, 3 uplink control, 4 done */
  phase: 0 | 1 | 2 | 3 | 4;
  /** true for scheduled DATA (vs unscheduled) */
  scheduled: boolean;
  /** true for a retransmitted DATA that must not be dropped again */
  retry: boolean;
  enqueuedAt: number | null;
  switchedAt: number | null;
  reason: string;
}

export interface SimEvent {
  at: number;
  text: string;
  rpcId?: number;
}

export interface Metrics {
  p50: number | null;
  p99: number | null;
  utilization: number;
  /** bytes waiting in each TOR priority queue, index = priority */
  queueByPriority: number[];
  activeRpcs: number;
  inactiveRpcs: number;
  grantedButNotReceived: number;
  wastedGrantPct: number;
  preemptionLag: number;
  completed: number;
  total: number;
}

export interface HomaState {
  now: number;
  rpcs: Rpc[];
  packets: Packet[];
  arrivals: Arrival[];
  nextArrivalIdx: number;
  nextRpcId: number;
  nextPacketId: number;
  switchBusyUntil: number;
  rngState: number;
  grantedSet: number[];
  preemptionLag: number;
  totalGrants: number;
  wastedGrants: number;
  totalBytesDelivered: number;
  completedLatencies: number[];
  events: SimEvent[];
  finished: boolean;
}

// --- init -----------------------------------------------------------------

export function initHoma(
  cfg: HomaConfig,
  seed = 1,
  arrivals?: Arrival[],
): HomaState {
  const built =
    arrivals !== undefined
      ? { arrivals, rngState: seed >>> 0 }
      : buildArrivals(cfg, seed);
  return {
    now: 0,
    rpcs: [],
    packets: [],
    arrivals: built.arrivals,
    nextArrivalIdx: 0,
    nextRpcId: 1,
    nextPacketId: 1,
    switchBusyUntil: 0,
    rngState: built.rngState,
    grantedSet: [],
    preemptionLag: 0,
    totalGrants: 0,
    wastedGrants: 0,
    totalBytesDelivered: 0,
    completedLatencies: [],
    events: [],
    finished: false,
  };
}

/** Incast: every sender fires a reply at t=0. */
export function initIncast(cfg: HomaConfig, seed = 1): HomaState {
  const arrivals: Arrival[] = [];
  let st = seed >>> 0;
  const n = Math.min(cfg.incastFanIn, cfg.senderCount);
  for (let i = 0; i < n; i++) {
    const [u, s] = nextRand(st);
    st = s;
    arrivals.push({ at: 0, senderId: `s${i}`, size: sampleWorkload(cfg.workload, u) });
  }
  const state = initHoma(cfg, seed, arrivals);
  return { ...state, rngState: st };
}

// --- helpers (exported for testing) --------------------------------------

export function outstandingGrants(r: Rpc): number {
  return Math.max(0, r.grantsIssued - r.scheduledDataArrived);
}

/** Rank active RPCs by remaining bytes ascending (SRPT), tie-break by id. */
export function rankByRemaining(rpcs: Rpc[]): Rpc[] {
  return [...rpcs]
    .filter((r) => r.announced && r.completedAt === null && r.totalBytes - r.bytesReceived > 0)
    .sort(
      (a, b) =>
        a.totalBytes - a.bytesReceived - (b.totalBytes - b.bytesReceived) ||
        a.id - b.id,
    );
}

/**
 * Assign scheduled priorities to the top `overcommitment` RPCs. Unscheduled
 * traffic always owns the top priority (priorityLevels - 1); scheduled traffic
 * uses the levels just below it, one per overcommitment slot.
 */
export function assignPriorities(
  ranked: Rpc[],
  cfg: HomaConfig,
): { granted: number[]; priorityById: Map<number, number> } {
  const granted: number[] = [];
  const priorityById = new Map<number, number>();
  const n = Math.min(cfg.overcommitment, ranked.length);
  for (let i = 0; i < n; i++) {
    const pri = cfg.priorityLevels - 2 - i;
    granted.push(ranked[i].id);
    priorityById.set(ranked[i].id, pri);
  }
  return { granted, priorityById };
}

// --- packet factories -----------------------------------------------------

function dataPacket(
  rpc: Rpc,
  bytes: number,
  priority: number,
  scheduled: boolean,
  now: number,
  id: number,
  cfg: HomaConfig,
  retry = false,
): Packet {
  return {
    id,
    kind: "DATA",
    rpcId: rpc.id,
    from: rpc.senderId,
    to: "recv",
    bytes,
    priority,
    sentAt: now,
    arrivesAt: now + cfg.oneWayDelay,
    phase: 0,
    scheduled,
    retry,
    enqueuedAt: null,
    switchedAt: null,
    reason: scheduled
      ? `scheduled DATA ${bytes}B, priority ${priority} (grant-driven)`
      : `unscheduled DATA ${bytes}B, priority ${priority} (blind send)`,
  };
}

function controlPacket(
  kind: PacketKind,
  rpc: Rpc,
  bytes: number,
  priority: number,
  now: number,
  id: number,
  cfg: HomaConfig,
  reason: string,
): Packet {
  return {
    id,
    kind,
    rpcId: rpc.id,
    from: "recv",
    to: rpc.senderId,
    bytes,
    priority,
    sentAt: now,
    arrivesAt: now + cfg.oneWayDelay,
    phase: 3,
    scheduled: false,
    retry: false,
    enqueuedAt: null,
    switchedAt: null,
    reason,
  };
}

// --- the step -------------------------------------------------------------

export function stepHoma(state: HomaState, cfg: HomaConfig): HomaState {
  if (state.finished) return state;
  const now = state.now + cfg.tickMs;
  const grantBytes = cfg.mtu;

  const rpcs = state.rpcs.map((r) => ({ ...r }));
  const rpcById = new Map(rpcs.map((r) => [r.id, r]));
  let packets = state.packets.map((p) => ({ ...p }));
  let nextPacketId = state.nextPacketId;
  let nextRpcId = state.nextRpcId;
  let switchBusyUntil = state.switchBusyUntil;
  let rngState = state.rngState;
  let preemptionLag = state.preemptionLag;
  let totalGrants = state.totalGrants;
  let wastedGrants = state.wastedGrants;
  let totalBytesDelivered = state.totalBytesDelivered;
  const completedLatencies = state.completedLatencies.slice();
  const events: SimEvent[] = [];
  const pushEvent = (text: string, rpcId?: number) =>
    events.push({ at: now, text, rpcId });

  const senderStalled = (senderId: string) =>
    cfg.faultDelayedSender === senderId;

  // 1. Spawn new RPCs whose arrival time has come.
  let nextArrivalIdx = state.nextArrivalIdx;
  while (nextArrivalIdx < state.arrivals.length) {
    const a = state.arrivals[nextArrivalIdx];
    if (a.at > now) break;
    const unscheduled = Math.min(cfg.rttBytes, a.size);
    const rpc: Rpc = {
      id: nextRpcId++,
      senderId: a.senderId,
      totalBytes: a.size,
      unscheduledBytes: unscheduled,
      scheduledBytes: a.size - unscheduled,
      bytesSent: 0,
      bytesReceived: 0,
      unscheduledSent: false,
      grantsIssued: 0,
      scheduledDataArrived: 0,
      priority: -1,
      createdAt: a.at,
      completedAt: null,
      announced: false,
      resendPending: false,
      lastProgressAt: now,
    };
    rpcs.push(rpc);
    rpcById.set(rpc.id, rpc);
    nextArrivalIdx++;
    pushEvent(
      `new RPC #${rpc.id} from ${a.senderId}: ${a.size}B (${unscheduled} unscheduled + ${rpc.scheduledBytes} scheduled)`,
      rpc.id,
    );
  }

  // 2. Senders: fire unscheduled DATA for newly created RPCs, and honor GRANTs
  //    that have arrived (handled in step 4 below — grants emit DATA there).
  for (const rpc of rpcs) {
    if (!rpc.unscheduledSent && rpc.createdAt <= now && !senderStalled(rpc.senderId)) {
      rpc.unscheduledSent = true;
      rpc.bytesSent += rpc.unscheduledBytes;
      packets.push(
        dataPacket(rpc, rpc.unscheduledBytes, cfg.priorityLevels - 1, false, now, nextPacketId++, cfg),
      );
      pushEvent(
        `blind send: ${rpc.unscheduledBytes}B unscheduled from ${rpc.senderId} (top priority ${cfg.priorityLevels - 1})`,
        rpc.id,
      );
    }
  }

  // 3. Phase 0 -> 1: DATA packets reach the TOR and enter their priority queue.
  for (const p of packets) {
    if (p.phase === 0 && p.arrivesAt <= now) {
      p.phase = 1;
      p.enqueuedAt = now;
      pushEvent(`DATA reached TOR, queued at priority ${p.priority}`, p.rpcId);
    }
  }

  // 4. TOR forwarding: serialize one packet at a time, highest priority first.
  //    The switch output is the downlink bottleneck.
  let guard = 0;
  while (switchBusyUntil <= now && guard < 1000) {
    guard++;
    const queued = packets.filter((p) => p.phase === 1);
    if (queued.length === 0) break;
    queued.sort(
      (a, b) => b.priority - a.priority || (a.enqueuedAt ?? 0) - (b.enqueuedAt ?? 0) || a.id - b.id,
    );
    const p = queued[0];
    const start = Math.max(switchBusyUntil, now);
    p.phase = 2;
    p.switchedAt = start;
    switchBusyUntil = start + p.bytes / cfg.bandwidth;
    p.arrivesAt = switchBusyUntil + cfg.oneWayDelay;
    pushEvent(`TOR forwards DATA (priority ${p.priority}, ${p.bytes}B) toward receiver`, p.rpcId);
  }

  // 5. Phase 2 -> deliver: DATA arrives at the receiver.
  for (const p of packets) {
    if (p.phase === 2 && p.arrivesAt <= now) {
      const rpc = rpcById.get(p.rpcId);
      if (rpc) {
        const deliver = Math.min(p.bytes, rpc.totalBytes - rpc.bytesReceived);
        rpc.bytesReceived += deliver;
        if (p.scheduled) rpc.scheduledDataArrived++;
        if (p.retry) rpc.resendPending = false;
        rpc.lastProgressAt = now;
        if (!rpc.announced) rpc.announced = true;
        totalBytesDelivered += deliver;
        pushEvent(
          `DATA delivered to receiver (${deliver}B, ${p.scheduled ? "scheduled" : "unscheduled"})`,
          p.rpcId,
        );
        if (rpc.bytesReceived >= rpc.totalBytes && rpc.completedAt === null) {
          rpc.completedAt = now;
          completedLatencies.push(now - rpc.createdAt);
          pushEvent(`RPC #${rpc.id} complete (latency ${now - rpc.createdAt}ms)`, rpc.id);
        }
      }
      p.phase = 4;
    }
  }

  // 6. Phase 3 -> act: uplink control packets (GRANT / RESEND / BUSY) arrive.
  for (const p of packets) {
    if (p.phase === 3 && p.arrivesAt <= now) {
      const rpc = rpcById.get(p.rpcId);
      if (p.kind === "GRANT" && rpc) {
        if (senderStalled(rpc.senderId)) {
          wastedGrants++;
          pushEvent(`BUSY: sender ${rpc.senderId} stalled, GRANT wasted`, rpc.id);
        } else {
          const remaining = rpc.totalBytes - rpc.bytesSent;
          const sz = Math.min(grantBytes, remaining);
          if (sz > 0) {
            rpc.bytesSent += sz;
            packets.push(
              dataPacket(rpc, sz, p.priority, true, now, nextPacketId++, cfg),
            );
            pushEvent(
              `scheduled DATA sent (${sz}B, priority ${p.priority}) after GRANT`,
              rpc.id,
            );
          } else {
            wastedGrants++;
            pushEvent(`GRANT arrived but sender has nothing left (wasted)`, rpc.id);
          }
        }
      } else if (p.kind === "RESEND" && rpc) {
        const remaining = rpc.totalBytes - rpc.bytesSent;
        const sz = Math.min(grantBytes, Math.max(grantBytes, remaining));
        rpc.bytesSent = Math.min(rpc.totalBytes, rpc.bytesSent + Math.min(grantBytes, remaining > 0 ? remaining : grantBytes));
        packets.push(dataPacket(rpc, sz, p.priority, true, now, nextPacketId++, cfg, true));
        pushEvent(`RESEND honored: retransmitting ${sz}B (retry, not dropped)`, rpc.id);
      }
      p.phase = 4;
    }
  }

  // 7. Receiver grant controller: rank by SRPT, assign priorities, issue grants.
  const ranked = rankByRemaining(rpcs);
  const { granted: newGranted, priorityById } = assignPriorities(ranked, cfg);
  for (const r of rpcs) {
    if (priorityById.has(r.id)) r.priority = priorityById.get(r.id)!;
    else if (r.announced && r.completedAt === null) r.priority = -1;
  }

  // preemption lag: an RPC that held a grant slot lost it to a shorter RPC while
  // it still had grants in flight.
  for (const id of state.grantedSet) {
    if (!newGranted.includes(id)) {
      const r = rpcById.get(id);
      if (r && outstandingGrants(r) > 0) {
        preemptionLag++;
        pushEvent(
          `preempted: RPC #${id} lost its grant slot to a shorter RPC (${outstandingGrants(r)} grant(s) still in flight)`,
          id,
        );
      }
    }
  }

  for (const id of newGranted) {
    const r = rpcById.get(id);
    if (!r) continue;
    const ungranted = r.scheduledBytes - r.grantsIssued * grantBytes;
    if (ungranted > 0 && outstandingGrants(r) < GRANT_WINDOW) {
      if (cfg.faultMissingGrant && r.grantsIssued % 3 === 0) {
        pushEvent(`missing-grant fault: receiver skips a GRANT for #${id}`, id);
      } else {
        r.grantsIssued++;
        totalGrants++;
        packets.push(
          controlPacket(
            "GRANT",
            r,
            grantBytes,
            r.priority,
            now,
            nextPacketId++,
            cfg,
            `GRANT for ${grantBytes}B (rank ${newGranted.indexOf(id)}, priority ${r.priority})`,
          ),
        );
        pushEvent(
          `GRANT issued to #${id} (rank ${newGranted.indexOf(id)}, scheduled priority ${r.priority})`,
          id,
        );
      }
    }
  }

  // 8. Loss detection: a granted range that makes no progress times out -> RESEND.
  if (cfg.faultLoss) {
    for (const r of rpcs) {
      if (
        r.announced &&
        r.completedAt === null &&
        !r.resendPending &&
        outstandingGrants(r) > 0 &&
        now - r.lastProgressAt > RESEND_TIMEOUT
      ) {
        r.resendPending = true;
        packets.push(
          controlPacket(
            "RESEND",
            r,
            grantBytes,
            Math.max(0, r.priority),
            now,
            nextPacketId++,
            cfg,
            `RESEND: stalled RPC, requesting retransmit`,
          ),
        );
        pushEvent(`RESEND: receiver detected stalled RPC #${r.id}, requesting retransmit`, r.id);
      }
    }
  }

  // 9. Drop scheduled DATA at send time when loss is armed (retry packets survive).
  //    Applied to scheduled DATA that just left the sender this tick.
  if (cfg.faultLoss) {
    const kept: Packet[] = [];
    for (const p of packets) {
      if (
        p.scheduled &&
        p.kind === "DATA" &&
        !p.retry &&
        p.sentAt === now &&
        p.phase === 0
      ) {
        const [u, s] = nextRand(rngState);
        rngState = s;
        if (u < cfg.lossRate) {
          pushEvent(`DATA dropped (loss): scheduled ${p.bytes}B from ${p.from}`, p.rpcId);
          continue; // drop: never arrives, receiver will RESEND
        }
      }
      kept.push(p);
    }
    packets = kept;
  }

  // 10. Retire finished packets.
  packets = packets.filter((p) => p.phase !== 4);

  const finished =
    nextArrivalIdx >= state.arrivals.length &&
    rpcs.length > 0 &&
    rpcs.every((r) => r.completedAt !== null) &&
    packets.length === 0;

  // keep only the most recent events for the "why this moved now" log
  const recent = state.events.concat(events).slice(-14);

  return {
    now,
    rpcs,
    packets,
    arrivals: state.arrivals,
    nextArrivalIdx,
    nextRpcId,
    nextPacketId,
    switchBusyUntil,
    rngState,
    grantedSet: newGranted,
    preemptionLag,
    totalGrants,
    wastedGrants,
    totalBytesDelivered,
    completedLatencies,
    events: recent,
    finished,
  };
}

// --- metrics --------------------------------------------------------------

export function computeMetrics(state: HomaState, cfg: HomaConfig): Metrics {
  const completed = state.completedLatencies;
  const percentile = (q: number): number | null => {
    if (completed.length === 0) return null;
    const sorted = [...completed].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.floor(q * sorted.length));
    return sorted[idx];
  };

  const queueByPriority = new Array(cfg.priorityLevels).fill(0);
  for (const p of state.packets) {
    if (p.phase === 1) queueByPriority[p.priority] += p.bytes;
  }

  const active = state.rpcs.filter(
    (r) => r.announced && r.completedAt === null && r.totalBytes - r.bytesReceived > 0,
  );
  const inactive = state.rpcs.filter(
    (r) => !r.announced && r.completedAt === null,
  );

  let grantedButNotReceived = 0;
  for (const r of active) {
    const g = (r.grantsIssued - r.scheduledDataArrived) * cfg.mtu;
    if (g > 0) grantedButNotReceived += g;
  }

  const utilization =
    state.now > 0 ? Math.min(1, state.totalBytesDelivered / (cfg.bandwidth * state.now)) : 0;

  return {
    p50: percentile(0.5),
    p99: percentile(0.99),
    utilization,
    queueByPriority,
    activeRpcs: active.length,
    inactiveRpcs: inactive.length,
    grantedButNotReceived,
    wastedGrantPct: state.totalGrants > 0 ? state.wastedGrants / state.totalGrants : 0,
    preemptionLag: state.preemptionLag,
    completed: completed.length,
    total: state.rpcs.length,
  };
}

/** Run a sim to completion (or maxSteps) and return the final state. */
export function runToCompletion(
  cfg: HomaConfig,
  seed = 1,
  arrivals?: Arrival[],
  maxSteps = 200000,
): HomaState {
  let s = initHoma(cfg, seed, arrivals);
  for (let i = 0; i < maxSteps && !s.finished; i++) s = stepHoma(s, cfg);
  return s;
}
