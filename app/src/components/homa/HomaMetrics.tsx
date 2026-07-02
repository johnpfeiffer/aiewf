import { HomaConfig, Metrics, SimEvent } from "../../models/homa";
import { TcpMetrics } from "../../models/homaTcp";

const fmtMs = (v: number | null) => (v === null ? "—" : `${v}ms`);
const fmtBytes = (v: number) =>
  v >= 1000 ? `${(v / 1000).toFixed(v >= 100000 ? 0 : 1)}KB` : `${v}B`;
const fmtPct = (v: number) => `${Math.round(v * 100)}%`;

interface MetricsPanelProps {
  metrics: Metrics;
  events: SimEvent[];
  config: HomaConfig;
  tcp?: TcpMetrics | null;
}

export function MetricsPanel({ metrics, events, config, tcp }: MetricsPanelProps) {
  const maxQueue = Math.max(1, ...metrics.queueByPriority);
  return (
    <>
      <div className="homa-card">
        <h3>Latency</h3>
        <div className="homa-metric-row">
          <span className="label">P50</span>
          <span className="value">{fmtMs(metrics.p50)}</span>
        </div>
        <div className="homa-metric-row">
          <span className="label">P99</span>
          <span className="value">{fmtMs(metrics.p99)}</span>
        </div>
        <div className="homa-metric-row">
          <span className="label">Completed</span>
          <span className="value">{metrics.completed}/{metrics.total}</span>
        </div>
        {tcp && (
          <>
            <div className="homa-metric-row">
              <span className="label">TCP P50</span>
              <span className="value">{fmtMs(tcp.p50)}</span>
            </div>
            <div className="homa-metric-row">
              <span className="label">TCP P99</span>
              <span className="value">{fmtMs(tcp.p99)}</span>
            </div>
            <div className="homa-metric-row">
              <span className="label">TCP HoL stalls</span>
              <span className="value">{tcp.holStalls}</span>
            </div>
          </>
        )}
      </div>

      <div className="homa-card">
        <h3>Link & buffers</h3>
        <div className="homa-metric-row">
          <span className="label">Utilization</span>
          <span className="value">{fmtPct(metrics.utilization)}</span>
        </div>
        <div className="homa-metric-row">
          <span className="label">Active / waiting</span>
          <span className="value">{metrics.activeRpcs} / {metrics.inactiveRpcs}</span>
        </div>
        <div className="homa-metric-row">
          <span className="label">Granted, not received</span>
          <span className="value">{fmtBytes(metrics.grantedButNotReceived)}</span>
        </div>
        <div className="homa-metric-row">
          <span className="label">Wasted grants</span>
          <span className="value">{fmtPct(metrics.wastedGrantPct)}</span>
        </div>
        <div className="homa-metric-row">
          <span className="label">Preemption lag</span>
          <span className="value">{metrics.preemptionLag}</span>
        </div>
      </div>

      <div className="homa-card">
        <h3>TOR queue by priority</h3>
        <div className="homa-queue-bars">
          {metrics.queueByPriority
            .map((bytes, p) => ({ bytes, p }))
            .reverse()
            .map(({ bytes, p }) => (
              <div className="homa-queue-bar" key={p}>
                <span className="qlabel">P{p}</span>
                <span className="qtrack">
                  <span className="qfill" style={{ width: `${(bytes / maxQueue) * 100}%`, background: p === config.priorityLevels - 1 ? "#e76f00" : "#2a8fbd" }} />
                </span>
                <span className="qbytes">{fmtBytes(bytes)}</span>
              </div>
            ))}
        </div>
      </div>

      <div className="homa-card">
        <h3>Why this moved now</h3>
        <div className="homa-log">
          {events.length === 0 && <div className="ev"><span className="tx">Press play to start the simulation.</span></div>}
          {events.map((e, i) => (
            <div className="ev" key={i}>
              <span className="t">{e.at}ms</span>
              <span className="tx">{e.text}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
