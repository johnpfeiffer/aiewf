import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  HomaConfig,
  HomaState,
  Packet,
  Rpc,
  assignPriorities,
  computeMetrics,
  initHoma,
  initIncast,
  outstandingGrants,
  rankByRemaining,
  runToCompletion,
  sampleWorkload,
  stepHoma,
} from "./homa";

const cfg = (over: Partial<HomaConfig> = {}): HomaConfig => ({
  ...DEFAULT_CONFIG,
  ...over,
});

function signature(s: HomaState) {
  return JSON.stringify({
    now: s.now,
    finished: s.finished,
    preemptionLag: s.preemptionLag,
    totalGrants: s.totalGrants,
    wastedGrants: s.wastedGrants,
    totalBytesDelivered: s.totalBytesDelivered,
    latencies: s.completedLatencies,
    rpcs: s.rpcs.map((r) => ({
      id: r.id,
      bytesSent: r.bytesSent,
      bytesReceived: r.bytesReceived,
      grantsIssued: r.grantsIssued,
      scheduledDataArrived: r.scheduledDataArrived,
      completedAt: r.completedAt,
    })),
  });
}

describe("homa workload + helpers", () => {
  it("sampleWorkload stays in range for every distribution", () => {
    for (const w of ["tiny", "mixed", "heavytail"] as const) {
      for (let i = 0; i < 200; i++) {
        const size = sampleWorkload(w, i / 200);
        expect(size).toBeGreaterThanOrEqual(1500);
        expect(size).toBeLessThanOrEqual(150000);
      }
    }
  });

  it("rankByRemaining sorts shortest remaining first", () => {
    const mk = (id: number, total: number, recv: number): Rpc =>
      ({
        id, senderId: "s0", totalBytes: total, unscheduledBytes: 1500,
        scheduledBytes: total - 1500, bytesSent: recv, bytesReceived: recv,
        unscheduledSent: true, grantsIssued: 0, scheduledDataArrived: 0,
        priority: -1, createdAt: 0, completedAt: null, announced: true,
        resendPending: false, lastProgressAt: 0,
      }) as Rpc;
    const ranked = rankByRemaining([
      mk(1, 10000, 0),
      mk(2, 1500, 0),
      mk(3, 5000, 4000),
    ]);
    expect(ranked.map((r) => r.id)).toEqual([3, 2, 1]);
  });

  it("assignPriorities grants the top overcommitment RPCs the levels below unscheduled", () => {
    const ranked: Rpc[] = [
      { id: 1 } as Rpc,
      { id: 2 } as Rpc,
      { id: 3 } as Rpc,
      { id: 4 } as Rpc,
    ];
    const { granted, priorityById } = assignPriorities(ranked, cfg({ priorityLevels: 8, overcommitment: 2 }));
    expect(granted).toEqual([1, 2]);
    expect(priorityById.get(1)).toBe(6);
    expect(priorityById.get(2)).toBe(5);
    expect(priorityById.has(3)).toBe(false);
  });

  it("outstandingGrants tracks grants not yet satisfied by data", () => {
    const r = { grantsIssued: 5, scheduledDataArrived: 2 } as Rpc;
    expect(outstandingGrants(r)).toBe(3);
  });
});

describe("homa engine: short vs long RPCs", () => {
  it("a short RPC (<= RTTbytes) sends only unscheduled data and needs no grants", () => {
    const s = runToCompletion(cfg({ rttBytes: 1500 }), 1, [
      { at: 0, senderId: "s0", size: 1500 },
    ]);
    expect(s.finished).toBe(true);
    expect(s.rpcs).toHaveLength(1);
    const r = s.rpcs[0];
    expect(r.grantsIssued).toBe(0);
    expect(r.bytesReceived).toBe(1500);
    expect(r.completedAt).not.toBeNull();
  });

  it("a long RPC sends unscheduled then grant-driven scheduled data", () => {
    const s = runToCompletion(cfg({ rttBytes: 1500 }), 1, [
      { at: 0, senderId: "s0", size: 15000 },
    ]);
    expect(s.finished).toBe(true);
    const r = s.rpcs[0];
    // 1500 unscheduled + 13500 scheduled = 9 grant-sized chunks.
    expect(r.unscheduledBytes).toBe(1500);
    expect(r.grantsIssued).toBe(9);
    expect(r.scheduledDataArrived).toBe(9);
    expect(r.bytesReceived).toBe(15000);
    expect(r.completedAt).not.toBeNull();
  });

  it("unscheduled data is sent before any grant is issued", () => {
    let s = initHoma(cfg({ rttBytes: 1500 }), 1, [
      { at: 0, senderId: "s0", size: 15000 },
    ]);
    // advance a few ticks: unscheduled DATA must be on the wire immediately.
    s = stepHoma(s, cfg({ rttBytes: 1500 }));
    const unsched = s.packets.find((p) => p.kind === "DATA" && !p.scheduled);
    expect(unsched).toBeDefined();
    expect(s.packets.some((p) => p.kind === "GRANT")).toBe(false);
  });
});

describe("homa engine: priority queues + overcommitment", () => {
  it("unscheduled top-priority data bypasses queued lower-priority scheduled data at the TOR", () => {
    const c = cfg({ priorityLevels: 8, overcommitment: 1, oneWayDelay: 5, bandwidth: 1500 });
    // A long RPC whose scheduled data is already queued at priority 6.
    const longRpc: Rpc = {
      id: 1, senderId: "s0", totalBytes: 30000, unscheduledBytes: 1500,
      scheduledBytes: 28500, bytesSent: 3000, bytesReceived: 1500,
      unscheduledSent: true, grantsIssued: 1, scheduledDataArrived: 0,
      priority: 6, createdAt: 0, completedAt: null, announced: true,
      resendPending: false, lastProgressAt: 10,
    };
    const queuedScheduled: Packet = {
      id: 1, kind: "DATA", rpcId: 1, from: "s0", to: "recv", bytes: 1500,
      priority: 6, sentAt: 9, arrivesAt: 14, phase: 1, scheduled: true,
      retry: false, enqueuedAt: 14, switchedAt: null,
      reason: "queued scheduled",
    };
    const shortRpc: Rpc = {
      id: 2, senderId: "s1", totalBytes: 1500, unscheduledBytes: 1500,
      scheduledBytes: 0, bytesSent: 1500, bytesReceived: 0,
      unscheduledSent: true, grantsIssued: 0, scheduledDataArrived: 0,
      priority: -1, createdAt: 14, completedAt: null, announced: false,
      resendPending: false, lastProgressAt: 14,
    };
    const unsched: Packet = {
      id: 2, kind: "DATA", rpcId: 2, from: "s1", to: "recv", bytes: 1500,
      priority: 7, sentAt: 14, arrivesAt: 19, phase: 0, scheduled: false,
      retry: false, enqueuedAt: null, switchedAt: null,
      reason: "unscheduled",
    };
    let s: HomaState = {
      now: 19, rpcs: [longRpc, shortRpc], packets: [queuedScheduled, unsched],
      arrivals: [], nextArrivalIdx: 0, nextRpcId: 3, nextPacketId: 3,
      switchBusyUntil: 19, rngState: 1, grantedSet: [1], preemptionLag: 0,
      totalGrants: 1, wastedGrants: 0, totalBytesDelivered: 1500,
      completedLatencies: [], events: [], finished: false,
    };
    s = stepHoma(s, c);
    const q = s.packets.find((p) => p.id === 2);
    const sd = s.packets.find((p) => p.id === 1);
    expect(q).toBeDefined();
    expect(sd).toBeDefined();
    // The unscheduled (priority 7) packet is forwarded first: lower switchedAt.
    expect((q!.switchedAt ?? Infinity) < (sd!.switchedAt ?? Infinity)).toBe(true);
  });

  it("overcommitment controls how many RPCs are granted simultaneously", () => {
    const arrivals = [
      { at: 0, senderId: "s0", size: 30000 },
      { at: 0, senderId: "s1", size: 30000 },
      { at: 0, senderId: "s2", size: 30000 },
    ];
    const c1 = cfg({ overcommitment: 1, rttBytes: 1500 });
    const c3 = cfg({ overcommitment: 3, rttBytes: 1500 });
    // step both until all three RPCs are announced, then snapshot granted set size
    let s1 = initHoma(c1, 1, arrivals);
    let s3 = initHoma(c3, 1, arrivals);
    for (let i = 0; i < 30; i++) {
      s1 = stepHoma(s1, c1);
      s3 = stepHoma(s3, c3);
    }
    expect(s3.grantedSet.length).toBeGreaterThan(s1.grantedSet.length);
    expect(s1.grantedSet.length).toBeLessThanOrEqual(1);
    expect(s3.grantedSet.length).toBeLessThanOrEqual(3);
  });
});

describe("homa engine: preemption + determinism + metrics", () => {
  it("a shorter RPC arriving mid-flight triggers preemption lag", () => {
    const c = cfg({ overcommitment: 1, rttBytes: 1500, oneWayDelay: 5 });
    // A long RPC is mid-flight with grants outstanding. A shorter-but-still-
    // scheduled RPC arrives and steals the single grant slot.
    const s = runToCompletion(c, 7, [
      { at: 0, senderId: "s0", size: 45000 },
      { at: 16, senderId: "s1", size: 6000 },
    ]);
    expect(s.preemptionLag).toBeGreaterThanOrEqual(1);
    expect(s.finished).toBe(true);
  });

  it("is deterministic: same seed and config produce identical traces", () => {
    const c = cfg({ overcommitment: 2 });
    const a = runToCompletion(c, 42);
    const b = runToCompletion(c, 42);
    expect(signature(a)).toBe(signature(b));
  });

  it("runs a mixed workload to completion with all RPCs finished", () => {
    const c = cfg({ overcommitment: 2 });
    const s = runToCompletion(c, 99);
    expect(s.finished).toBe(true);
    expect(s.rpcs.length).toBeGreaterThan(0);
    expect(s.rpcs.every((r) => r.completedAt !== null)).toBe(true);
    expect(s.completedLatencies.length).toBe(s.rpcs.length);
  });

  it("incast init fans out one reply per sender at t=0", () => {
    const c = cfg({ senderCount: 5, incastFanIn: 5 });
    const s = initIncast(c, 1);
    expect(s.arrivals).toHaveLength(5);
    expect(s.arrivals.every((a) => a.at === 0)).toBe(true);
    expect(new Set(s.arrivals.map((a) => a.senderId)).size).toBe(5);
  });

  it("computeMetrics reports percentiles, utilization and queue occupancy", () => {
    const c = cfg({ overcommitment: 2 });
    const s = runToCompletion(c, 5);
    const m = computeMetrics(s, c);
    expect(m.completed).toBe(s.rpcs.length);
    expect(m.p50).not.toBeNull();
    expect(m.p99).not.toBeNull();
    expect(m.utilization).toBeGreaterThanOrEqual(0);
    expect(m.utilization).toBeLessThanOrEqual(1);
    expect(m.queueByPriority).toHaveLength(c.priorityLevels);
  });
});
