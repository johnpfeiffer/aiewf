import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  HomaConfig,
} from "./homa";
import {
  TcpState,
  computeTcpMetrics,
  initTcp,
  runTcpToCompletion,
  stepTcp,
} from "./homaTcp";

const cfg = (over: Partial<HomaConfig> = {}): HomaConfig => ({
  ...DEFAULT_CONFIG,
  ...over,
});

function tcpSignature(s: TcpState) {
  return JSON.stringify({
    now: s.now,
    finished: s.finished,
    holStalls: s.holStalls,
    totalBytesDelivered: s.totalBytesDelivered,
    latencies: s.completedLatencies,
    rpcs: s.rpcs.map((r) => ({
      id: r.id,
      bytesSent: r.bytesSent,
      deliveredBytes: r.deliveredBytes,
      completedAt: r.completedAt,
    })),
  });
}

describe("tcp engine", () => {
  it("does not send data before the handshake completes", () => {
    let s = initTcp(cfg({ oneWayDelay: 5 }), 1, [
      { at: 0, senderId: "s0", size: 15000 },
    ]);
    // oneWayDelay=5 -> handshake = 15ms. Step a few ms: no bytes on the wire yet.
    for (let i = 0; i < 10; i++) s = stepTcp(s, cfg({ oneWayDelay: 5 }));
    expect(s.rpcs[0].bytesSent).toBe(0);
    expect(s.segments.length).toBe(0);
  });

  it("fair-shares the link: two ready connections both make progress", () => {
    let s = initTcp(cfg({ oneWayDelay: 5 }), 1, [
      { at: 0, senderId: "s0", size: 30000 },
      { at: 0, senderId: "s1", size: 30000 },
    ]);
    for (let i = 0; i < 60; i++) s = stepTcp(s, cfg({ oneWayDelay: 5 }));
    // both connections should have sent a similar number of bytes (round-robin)
    expect(s.rpcs[0].bytesSent).toBeGreaterThan(0);
    expect(s.rpcs[1].bytesSent).toBeGreaterThan(0);
    expect(Math.abs(s.rpcs[0].bytesSent - s.rpcs[1].bytesSent)).toBeLessThanOrEqual(1500);
  });

  it("head-of-line blocking: a lost segment stalls delivery until RTO retransmit", () => {
    let s = initTcp(cfg({ oneWayDelay: 5, faultLoss: true, lossRate: 0.5 }), 3, [
      { at: 0, senderId: "s0", size: 30000 },
    ]);
    // step well past the RTO so a retransmit can fill the gap
    for (let i = 0; i < 200; i++) s = stepTcp(s, cfg({ oneWayDelay: 5, faultLoss: true, lossRate: 0.5 }));
    expect(s.holStalls).toBeGreaterThan(0);
  });

  it("runs a workload to completion without loss", () => {
    const s = runTcpToCompletion(cfg(), 9);
    expect(s.finished).toBe(true);
    expect(s.rpcs.every((r) => r.completedAt !== null)).toBe(true);
    expect(s.completedLatencies.length).toBe(s.rpcs.length);
  });

  it("is deterministic", () => {
    const c = cfg();
    const a = runTcpToCompletion(c, 42);
    const b = runTcpToCompletion(c, 42);
    expect(tcpSignature(a)).toBe(tcpSignature(b));
  });

  it("computeTcpMetrics reports setup cost and percentiles", () => {
    const c = cfg({ oneWayDelay: 5 });
    const s = runTcpToCompletion(c, 5);
    const m = computeTcpMetrics(s, c);
    expect(m.setupMs).toBe(15);
    expect(m.completed).toBe(s.rpcs.length);
    expect(m.p50).not.toBeNull();
    expect(m.utilization).toBeGreaterThanOrEqual(0);
    expect(m.utilization).toBeLessThanOrEqual(1);
  });
});
