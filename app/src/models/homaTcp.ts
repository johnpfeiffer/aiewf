// Simplified TCP engine for the "TCP vs Homa" scene.
//
// This is deliberately NOT a full TCP stack. It keeps just enough to show why
// TCP is a poor fit for datacenter RPC workloads:
//   - connection setup: a 3-way handshake (1.5 RTT) before any data flows;
//   - fair sharing: the bottleneck link is shared round-robin across active
//     connections instead of serving the shortest message first (no SRPT), so a
//     short RPC stranded behind a long flow suffers high tail latency;
//   - stream head-of-line blocking: in-order delivery means a single lost
//     segment stalls every later segment for that connection until a retransmit
//     arrives (RESEND/retransmission is much slower than Homa's).
//
// Same arrivals + seed as the Homa engine so the two are directly comparable.

import {
  Arrival,
  HomaConfig,
  PacketKind,
  SimEvent,
  buildArrivals,
  nextRand,
} from "./homa";

export interface TcpRpc {
  id: number;
  senderId: string;
  totalBytes: number;
  bytesSent: number;
  /** in-order bytes delivered up to the application */
  deliveredBytes: number;
  createdAt: number;
  /** earliest time data may flow (after handshake) */
  connectionReadyAt: number;
  completedAt: number | null;
  /** byte offset of the currently missing segment, or -1 */
  lostSeq: number;
  lostAt: number;
  retransmitInFlight: boolean;
  buffer: Map<number, number>;
}

export interface TcpSegment {
  id: number;
  rpcId: number;
  seq: number;
  bytes: number;
  sentAt: number;
  arrivesAt: number;
  lost: boolean;
  retry: boolean;
  kind: PacketKind;
  reason: string;
}

export interface TcpState {
  now: number;
  rpcs: TcpRpc[];
  segments: TcpSegment[];
  arrivals: Arrival[];
  nextArrivalIdx: number;
  nextRpcId: number;
  nextSegId: number;
  linkBusyUntil: number;
  rrIndex: number;
  rngState: number;
  totalBytesDelivered: number;
  completedLatencies: number[];
  events: SimEvent[];
  finished: boolean;
  holStalls: number;
}

export const TCP_RTO = 40; // ms before a lost segment is retransmitted

export function initTcp(
  cfg: HomaConfig,
  seed = 1,
  arrivals?: Arrival[],
): TcpState {
  const built =
    arrivals !== undefined
      ? { arrivals, rngState: seed >>> 0 }
      : buildArrivals(cfg, seed);
  return {
    now: 0,
    rpcs: [],
    segments: [],
    arrivals: built.arrivals,
    nextArrivalIdx: 0,
    nextRpcId: 1,
    nextSegId: 1,
    linkBusyUntil: 0,
    rrIndex: 0,
    rngState: built.rngState,
    totalBytesDelivered: 0,
    completedLatencies: [],
    events: [],
    finished: false,
    holStalls: 0,
  };
}

function drain(rpc: TcpRpc): number {
  let delivered = 0;
  while (rpc.buffer.has(rpc.deliveredBytes)) {
    const sz = rpc.buffer.get(rpc.deliveredBytes)!;
    rpc.buffer.delete(rpc.deliveredBytes);
    rpc.deliveredBytes += sz;
    delivered += sz;
  }
  return delivered;
}

export function stepTcp(state: TcpState, cfg: HomaConfig): TcpState {
  if (state.finished) return state;
  const now = state.now + cfg.tickMs;
  const mtu = cfg.mtu;
  const handshake = 3 * cfg.oneWayDelay; // SYN + SYN-ACK + ACK = 1.5 RTT

  const rpcs = state.rpcs.map((r) => ({
    ...r,
    buffer: new Map(r.buffer),
  }));
  const rpcById = new Map(rpcs.map((r) => [r.id, r]));
  let segments = state.segments.map((s) => ({ ...s }));
  let nextSegId = state.nextSegId;
  let nextRpcId = state.nextRpcId;
  let linkBusyUntil = state.linkBusyUntil;
  let rrIndex = state.rrIndex;
  let rngState = state.rngState;
  let totalBytesDelivered = state.totalBytesDelivered;
  let holStalls = state.holStalls;
  const completedLatencies = state.completedLatencies.slice();
  const events: SimEvent[] = [];
  const pushEvent = (text: string, rpcId?: number) =>
    events.push({ at: now, text, rpcId });

  // 1. Spawn new connections.
  let nextArrivalIdx = state.nextArrivalIdx;
  while (nextArrivalIdx < state.arrivals.length) {
    const a = state.arrivals[nextArrivalIdx];
    if (a.at > now) break;
    const rpc: TcpRpc = {
      id: nextRpcId++,
      senderId: a.senderId,
      totalBytes: a.size,
      bytesSent: 0,
      deliveredBytes: 0,
      createdAt: a.at,
      connectionReadyAt: a.at + handshake,
      completedAt: null,
      lostSeq: -1,
      lostAt: 0,
      retransmitInFlight: false,
      buffer: new Map(),
    };
    rpcs.push(rpc);
    rpcById.set(rpc.id, rpc);
    nextArrivalIdx++;
    pushEvent(
      `new connection #${rpc.id} from ${a.senderId}: ${a.size}B (handshake ${handshake}ms)`,
      rpc.id,
    );
  }

  // 2. Deliver arrived segments in order (head-of-line blocking on loss).
  for (const s of segments) {
    if (s.arrivesAt > now) continue;
    const rpc = rpcById.get(s.rpcId);
    if (!rpc) {
      s.arrivesAt = -1; // retire
      continue;
    }
    if (s.lost) {
      // The segment is gone. Record the gap; later bytes are stuck (HoL).
      if (rpc.lostSeq < 0) {
        rpc.lostSeq = s.seq;
        rpc.lostAt = now;
        holStalls++;
        pushEvent(`HoL block: segment ${s.seq}B lost, stream stalls`, rpc.id);
      }
      s.arrivesAt = -1;
      continue;
    }
    rpc.buffer.set(s.seq, s.bytes);
    if (s.retry && s.seq === rpc.lostSeq) {
      rpc.lostSeq = -1;
      rpc.retransmitInFlight = false;
      pushEvent(`retransmit filled the gap, stream resumes`, rpc.id);
    }
    const delivered = drain(rpc);
    if (delivered > 0) {
      totalBytesDelivered += delivered;
      pushEvent(`delivered ${delivered}B in order to app`, rpc.id);
      if (rpc.deliveredBytes >= rpc.totalBytes && rpc.completedAt === null) {
        rpc.completedAt = now;
        completedLatencies.push(now - rpc.createdAt);
        pushEvent(`connection #${rpc.id} complete (latency ${now - rpc.createdAt}ms)`, rpc.id);
      }
    }
    s.arrivesAt = -1; // retire
  }
  segments = segments.filter((s) => s.arrivesAt > 0);

  // 3. Retransmit lost segments after RTO.
  if (cfg.faultLoss) {
    for (const rpc of rpcs) {
      if (
        rpc.lostSeq >= 0 &&
        !rpc.retransmitInFlight &&
        now - rpc.lostAt > TCP_RTO
      ) {
        rpc.retransmitInFlight = true;
        const start = Math.max(linkBusyUntil, now);
        linkBusyUntil = start + mtu / cfg.bandwidth;
        segments.push({
          id: nextSegId++,
          rpcId: rpc.id,
          seq: rpc.lostSeq,
          bytes: Math.min(mtu, rpc.totalBytes - rpc.lostSeq),
          sentAt: now,
          arrivesAt: linkBusyUntil + cfg.oneWayDelay,
          lost: false,
          retry: true,
          kind: "DATA",
          reason: `TCP retransmit of lost segment (RTO ${TCP_RTO}ms)`,
        });
        pushEvent(`RTO fired: retransmitting lost segment`, rpc.id);
      }
    }
  }

  // 4. Fair-shared send: round-robin across ready connections on the FIFO link.
  const ready = rpcs.filter(
    (r) => r.connectionReadyAt <= now && r.bytesSent < r.totalBytes,
  );
  let guard = 0;
  while (linkBusyUntil <= now && ready.length > 0 && guard < 1000) {
    guard++;
    const rpc = ready[rrIndex % ready.length];
    rrIndex = (rrIndex + 1) % ready.length;
    if (rpc.bytesSent >= rpc.totalBytes) {
      // skip and continue (round-robin index will move past it next tick)
      ready.splice(rrIndex % ready.length, 0);
      if (ready.length === 0) break;
      continue;
    }
    const seq = rpc.bytesSent;
    const bytes = Math.min(mtu, rpc.totalBytes - rpc.bytesSent);
    rpc.bytesSent += bytes;
    const start = Math.max(linkBusyUntil, now);
    linkBusyUntil = start + bytes / cfg.bandwidth;
    let lost = false;
    if (cfg.faultLoss && !rpc.retransmitInFlight) {
      const [u, s] = nextRand(rngState);
      rngState = s;
      lost = u < cfg.lossRate;
    }
    segments.push({
      id: nextSegId++,
      rpcId: rpc.id,
      seq,
      bytes,
      sentAt: now,
      arrivesAt: linkBusyUntil + cfg.oneWayDelay,
      lost,
      retry: false,
      kind: "DATA",
      reason: lost
        ? `TCP segment lost (will stall the stream)`
        : `TCP segment ${bytes}B (fair share, in-order stream)`,
    });
    pushEvent(
      `sent segment ${bytes}B for #${rpc.id} (fair share)${lost ? " — LOST" : ""}`,
      rpc.id,
    );
  }

  const finished =
    nextArrivalIdx >= state.arrivals.length &&
    rpcs.length > 0 &&
    rpcs.every((r) => r.completedAt !== null) &&
    segments.length === 0;

  const recent = state.events.concat(events).slice(-14);

  return {
    now,
    rpcs,
    segments,
    arrivals: state.arrivals,
    nextArrivalIdx,
    nextRpcId,
    nextSegId,
    linkBusyUntil,
    rrIndex,
    rngState,
    totalBytesDelivered,
    completedLatencies,
    events: recent,
    finished,
    holStalls,
  };
}

export interface TcpMetrics {
  p50: number | null;
  p99: number | null;
  utilization: number;
  completed: number;
  total: number;
  holStalls: number;
  setupMs: number;
}

export function computeTcpMetrics(state: TcpState, cfg: HomaConfig): TcpMetrics {
  const completed = state.completedLatencies;
  const percentile = (q: number): number | null => {
    if (completed.length === 0) return null;
    const sorted = [...completed].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  };
  const utilization =
    state.now > 0 ? Math.min(1, state.totalBytesDelivered / (cfg.bandwidth * state.now)) : 0;
  return {
    p50: percentile(0.5),
    p99: percentile(0.99),
    utilization,
    completed: completed.length,
    total: state.rpcs.length,
    holStalls: state.holStalls,
    setupMs: 3 * cfg.oneWayDelay,
  };
}

export function runTcpToCompletion(
  cfg: HomaConfig,
  seed = 1,
  arrivals?: Arrival[],
  maxSteps = 200000,
): TcpState {
  let s = initTcp(cfg, seed, arrivals);
  for (let i = 0; i < maxSteps && !s.finished; i++) s = stepTcp(s, cfg);
  return s;
}
