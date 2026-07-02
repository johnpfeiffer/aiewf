import { Scene } from "../../models/homa";

interface OverlaysProps {
  scene: Scene;
}

const OVERLAY: Record<string, { title: string; body: string; color: string }> = {
  notSchedule: {
    title: "Why not schedule everything?",
    body: "Waiting for a scheduler before sending would add a round trip to every tiny message. Homa instead sends the first RTTbytes blindly and unscheduled, so short RPCs finish in about one RTT with no grant round-trip at all.",
    color: "#d2691e",
  },
  receiverDriven: {
    title: "Why receiver-driven?",
    body: "The receiver is the only place that sees all inbound contention. It ranks arriving messages by remaining bytes (SRPT) and hands out GRANTs plus priority lanes, so the shortest train always gets the fastest track.",
    color: "#2a8fbd",
  },
  buffering: {
    title: "Why allow some buffering?",
    body: "Zero buffering wastes the link: while one sender's grant is in flight, the link would idle. Controlled overcommitment lets a few trains share the tracks, lifting utilization at the cost of some receiver buffer.",
    color: "#2e9e6b",
  },
  tcp: {
    title: "TCP vs Homa",
    body: "TCP pays a 3-way handshake before data, fair-shares the link so short RPCs wait behind long flows, and blocks the whole stream when one segment is lost (head-of-line). Homa has no connection setup, serves the shortest message first, and tolerates out-of-order delivery.",
    color: "#7b5cd6",
  },
};

/** Explanatory overlays. Each animation maps to a protocol rule; these callouts
 *  state the rule in plain language so the "why" is always visible. */
export function HomaOverlays({ scene }: OverlaysProps) {
  const keys: string[] = [];
  if (scene === "tcp-vs-homa") keys.push("tcp");
  if (scene === "blind-send" || scene === "priority-queues") keys.push("notSchedule");
  if (scene === "priority-queues" || scene === "overcommitment") keys.push("receiverDriven");
  if (scene === "overcommitment") keys.push("buffering");

  if (keys.length === 0) return null;
  return (
    <div className="homa-overlays">
      {keys.map((k) => {
        const o = OVERLAY[k];
        return (
          <div className="homa-overlay" key={k} style={{ borderLeftColor: o.color }}>
            <h4>{o.title}</h4>
            <p>{o.body}</p>
          </div>
        );
      })}
    </div>
  );
}
