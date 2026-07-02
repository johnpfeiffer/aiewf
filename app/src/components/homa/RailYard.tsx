import { useMemo } from "react";
import type { SVGProps } from "react";
import { HomaConfig, HomaState, PacketKind, rankByRemaining } from "../../models/homa";

interface RailYardProps {
  homa: HomaState;
  config: HomaConfig;
}

const PAL = [
  "#c9ced6", "#9aa3af", "#7b5cd6", "#2a8fbd",
  "#2e9e6b", "#e0a93b", "#d2691e", "#e76f00",
];

export function priorityColor(p: number, levels: number): string {
  const i = Math.min(7, Math.max(0, Math.round((p / (levels - 1 || 1)) * 7)));
  return PAL[i];
}

export function controlColor(kind: PacketKind): string {
  switch (kind) {
    case "GRANT":
      return "#2a8fbd";
    case "RESEND":
      return "#d6456f";
    case "BUSY":
      return "#d2691e";
    default:
      return "#9aa3af";
  }
}

/** A rect that carries a native SVG tooltip explaining why it moved when it did. */
function TitledRect({ label, ...rest }: SVGProps<SVGRectElement> & { label: string }) {
  return (
    <rect {...rest}>
      <title>{label}</title>
    </rect>
  );
}

const W = 1040;
const H = 560;
const SENDER_X = 24;
const SENDER_W = 200;
const TOR_X = 300;
const TOR_W = 380;
const RECV_X = 760;
const RECV_W = 256;
const TOP = 58;
const AREA_H = 360;

/** Rail-yard visualization. Messages are trains, the TOR holds priority tracks,
 *  and the receiver is the yard tower that ranks trains by remaining length
 *  (SRPT) and hands out grants. Every moving car carries a native tooltip
 *  explaining why it moved when it did. */
export function RailYard({ homa, config }: RailYardProps) {
  const levels = config.priorityLevels;
  const senders = useMemo(
    () => Array.from({ length: config.senderCount }, (_, i) => `s${i}`),
    [config.senderCount],
  );
  const rowH = Math.min(52, AREA_H / senders.length);
  const laneH = Math.min(44, AREA_H / levels);
  const senderY = (i: number) => TOP + i * rowH + rowH / 2;
  const laneY = (p: number) => TOP + (levels - 1 - p) * laneH + laneH / 2;

  const ranked = rankByRemaining(homa.rpcs);
  const grantedSet = new Set(homa.grantedSet);
  const rpcById = useMemo(
    () => new Map(homa.rpcs.map((r) => [r.id, r])),
    [homa.rpcs],
  );
  const senderRpcs = (sid: string) => homa.rpcs.filter((r) => r.senderId === sid);

  const carW = (bytes: number) => Math.max(6, Math.min(26, bytes / 40));
  const progress = (a: number, b: number) =>
    b <= a ? 0 : Math.max(0, Math.min(1, (homa.now - a) / (b - a)));
  const utilization = Math.min(1, homa.totalBytesDelivered / (config.bandwidth * (homa.now || 1)));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Homa rail-yard simulation">
      {/* uplink channel for grants / resends (receiver -> sender) */}
      <line x1={RECV_X + RECV_W} y1={30} x2={SENDER_X} y2={30} stroke="#e3e6ec" strokeWidth={2} />
      <text x={W / 2} y={22} textAnchor="middle" fontSize={11} fill="#9aa3af">
        uplink: GRANT / RESEND / BUSY (receiver drives the senders)
      </text>

      {/* sender stations */}
      {senders.map((sid, i) => {
        const y = senderY(i);
        const rpcs = senderRpcs(sid);
        return (
          <g key={sid}>
            <rect x={SENDER_X} y={y - rowH / 2 + 3} width={SENDER_W} height={rowH - 6}
              rx={6} fill="#fff" stroke="#d8dde6" />
            <text x={SENDER_X + 8} y={y - rowH / 2 + 16} fontSize={11} fontWeight={700} fill="#1f2430">
              {sid}
            </text>
            <text x={SENDER_X + 8} y={y + 6} fontSize={10} fill="#9aa3af">
              {rpcs.filter((r) => r.completedAt === null).length} active
            </text>
            {rpcs.slice(0, 5).map((r, k) => {
              const remaining = r.totalBytes - r.bytesReceived;
              const w = Math.max(8, Math.min(170, (remaining / 50000) * 170));
              const by = y - 6 + k * 4 - 6;
              const col = r.priority >= 0 ? priorityColor(r.priority, levels) : "#c9ced6";
              return (
                <TitledRect key={r.id} x={SENDER_X + 40} y={by} width={w} height={5}
                  rx={2} fill={col} opacity={r.completedAt ? 0.3 : 0.9}
                  label={`RPC #${r.id}: ${r.totalBytes}B, ${remaining}B remaining, priority ${r.priority}`} />
              );
            })}
          </g>
        );
      })}

      {/* TOR priority tracks */}
      <rect x={TOR_X} y={TOP - 4} width={TOR_W} height={AREA_H + 8} rx={8} fill="#fff" stroke="#d8dde6" />
      <text x={TOR_X + 8} y={TOP - 10} fontSize={11} fontWeight={700} fill="#1f2430">
        TOR switch · priority tracks
      </text>
      {Array.from({ length: levels }, (_, p) => {
        const y = laneY(p);
        const isUnsched = p === levels - 1;
        return (
          <g key={p}>
            <rect x={TOR_X + 34} y={y - laneH / 2 + 2} width={TOR_W - 42} height={laneH - 4}
              rx={3} fill={isUnsched ? "#fdeee2" : "#f5f6f8"} stroke="#eef0f4" />
            <text x={TOR_X + 8} y={y + 3} fontSize={10} fill="#9aa3af" fontWeight={600}>
              P{p}{isUnsched ? "·unsched" : ""}
            </text>
          </g>
        );
      })}

      {/* queued packets (phase 1) on their priority track */}
      {homa.packets
        .filter((p) => p.phase === 1)
        .map((p) => {
          const y = laneY(p.priority);
          const queuedAhead = homa.packets.filter(
            (q) => q.phase === 1 && q.priority === p.priority && (q.enqueuedAt ?? 0) < (p.enqueuedAt ?? 0),
          ).length;
          const x = TOR_X + 40 + queuedAhead * 18;
          return (
            <TitledRect key={p.id} x={x} y={y - 7} width={carW(p.bytes)} height={14}
              rx={2} fill={priorityColor(p.priority, levels)} stroke="#1f243022"
              label={`${p.reason} · queued at TOR, priority ${p.priority}`} />
          );
        })}

      {/* receiver tower + SRPT ladder */}
      <rect x={RECV_X} y={TOP - 4} width={RECV_W} height={AREA_H + 8} rx={8} fill="#fff" stroke="#d8dde6" />
      <text x={RECV_X + 8} y={TOP - 10} fontSize={11} fontWeight={700} fill="#1f2430">
        Receiver · tower (SRPT)
      </text>
      {ranked.slice(0, 10).map((r, i) => {
        const remaining = r.totalBytes - r.bytesReceived;
        const w = Math.max(10, Math.min(210, (remaining / 50000) * 210));
        const y = TOP + 6 + i * 22;
        const granted = grantedSet.has(r.id);
        return (
          <g key={r.id}>
            <TitledRect x={RECV_X + 8} y={y} width={w} height={16} rx={3}
              fill={r.priority >= 0 ? priorityColor(r.priority, levels) : "#eef0f4"}
              stroke={granted ? "#1f2430" : "#d8dde6"} strokeWidth={granted ? 2 : 1}
              label={`RPC #${r.id}: ${remaining}B remaining${granted ? " · GRANTED" : " · waiting"}`} />
            <text x={RECV_X + 12} y={y + 12} fontSize={10} fill="#1f2430">
              #{r.id} · {remaining}B{granted ? " · grant" : ""}
            </text>
          </g>
        );
      })}
      {ranked.length === 0 && (
        <text x={RECV_X + 16} y={TOP + 24} fontSize={12} fill="#9aa3af">
          no active RPCs yet
        </text>
      )}

      {/* in-flight downlink DATA: sender -> TOR (phase 0) */}
      {homa.packets
        .filter((p) => p.phase === 0)
        .map((p) => {
          const rpc = rpcById.get(p.rpcId);
          const si = rpc ? Number(rpc.senderId.slice(1)) : 0;
          const y = senderY(Math.min(si, senders.length - 1));
          const pr = progress(p.sentAt, p.arrivesAt);
          const x = SENDER_X + SENDER_W + pr * (TOR_X - (SENDER_X + SENDER_W));
          return (
            <TitledRect key={p.id} x={x} y={y - 6} width={carW(p.bytes)} height={12}
              rx={2} fill={priorityColor(p.priority, levels)}
              label={`${p.reason} · heading to TOR`} />
          );
        })}

      {/* in-flight downlink DATA: TOR -> receiver (phase 2) */}
      {homa.packets
        .filter((p) => p.phase === 2)
        .map((p) => {
          const y = laneY(p.priority);
          const base = p.switchedAt ?? p.sentAt;
          const pr = progress(base, p.arrivesAt);
          const x = TOR_X + TOR_W + pr * (RECV_X - (TOR_X + TOR_W));
          return (
            <TitledRect key={p.id} x={x} y={y - 6} width={carW(p.bytes)} height={12}
              rx={2} fill={priorityColor(p.priority, levels)}
              label={`${p.reason} · forwarded from TOR to receiver`} />
          );
        })}

      {/* uplink control: receiver -> sender (phase 3) */}
      {homa.packets
        .filter((p) => p.phase === 3)
        .map((p) => {
          const rpc = rpcById.get(p.rpcId);
          const targetX = SENDER_X + SENDER_W / 2;
          const pr = progress(p.sentAt, p.arrivesAt);
          const x = RECV_X + RECV_W - pr * (RECV_X + RECV_W - targetX);
          return (
            <g key={p.id}>
              <TitledRect x={x - 5} y={24} width={10} height={12} rx={2}
                fill={controlColor(p.kind)} stroke="#1f243033"
                label={`${p.reason} · uplink to ${rpc?.senderId ?? "?"}`} />
              <text x={x} y={21} textAnchor="middle" fontSize={9} fill={controlColor(p.kind)} fontWeight={700}>
                {p.kind[0]}
              </text>
            </g>
          );
        })}

      {/* downlink utilization meter */}
      <rect x={TOR_X} y={TOP + AREA_H + 14} width={TOR_W} height={8} rx={4} fill="#f5f6f8" stroke="#eef0f4" />
      <rect x={TOR_X} y={TOP + AREA_H + 14} width={TOR_W * utilization} height={8} rx={4} fill="#2e9e6b" />
      <text x={TOR_X} y={TOP + AREA_H + 34} fontSize={10} fill="#9aa3af">
        downlink utilization
      </text>

      <text x={W - 8} y={H - 8} textAnchor="end" fontSize={11} fill="#9aa3af">
        t = {homa.now}ms · {homa.completedLatencies.length}/{homa.rpcs.length} done
      </text>
    </svg>
  );
}
