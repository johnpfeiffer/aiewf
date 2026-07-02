import type { SVGProps } from "react";
import { HomaConfig } from "../../models/homa";
import { TcpState } from "../../models/homaTcp";

interface TcpViewProps {
  tcp: TcpState;
  config: HomaConfig;
}

function TitledRect({ label, ...rest }: SVGProps<SVGRectElement> & { label: string }) {
  return (
    <rect {...rest}>
      <title>{label}</title>
    </rect>
  );
}

const W = 520;
const H = 560;
const TOP = 58;
const AREA_H = 360;
const BAR_X = 150;
const BAR_W = 330;

/** Compact TCP stream view for the contrast scene: per-connection rows show the
 *  handshake wait, fair-share progress, in-flight segments, and head-of-line
 *  stalls. There are no priority tracks here — every connection gets an equal
 *  slice, which is exactly the point. */
export function TcpView({ tcp, config }: TcpViewProps) {
  const rows = tcp.rpcs.slice(0, 8);
  const rowH = AREA_H / Math.max(1, rows.length);
  const setupMs = 3 * config.oneWayDelay;
  const utilization = Math.min(1, tcp.totalBytesDelivered / (config.bandwidth * (tcp.now || 1)));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="TCP stream simulation">
      <text x={8} y={TOP - 10} fontSize={11} fontWeight={700} fill="#1f2430">
        TCP · in-order streams, fair share
      </text>

      {rows.map((r, i) => {
        const y = TOP + i * rowH;
        const frac = r.totalBytes > 0 ? r.deliveredBytes / r.totalBytes : 0;
        const waiting = tcp.now < r.connectionReadyAt;
        return (
          <g key={r.id}>
            <rect x={8} y={y + 2} width={W - 16} height={rowH - 6} rx={4} fill="#fff" stroke="#eef0f4" />
            <text x={12} y={y + rowH / 2 + 3} fontSize={10} fill="#1f2430" fontWeight={600}>
              #{r.id}
            </text>

            {waiting && (
              <g>
                <TitledRect x={BAR_X} y={y + rowH / 2 - 5} width={Math.min(60, setupMs * 2)} height={10}
                  rx={2} fill="none" stroke="#9aa3af" strokeDasharray="3 3"
                  label={`3-way handshake: ${setupMs}ms before any data`} />
                <text x={BAR_X + 4} y={y + rowH / 2 + 2} fontSize={9} fill="#9aa3af">
                  handshake
                </text>
              </g>
            )}

            {!waiting && (
              <rect x={BAR_X} y={y + rowH / 2 - 6} width={BAR_W} height={12} rx={3} fill="#f5f6f8" stroke="#eef0f4" />
            )}
            {!waiting && (
              <TitledRect x={BAR_X} y={y + rowH / 2 - 6} width={BAR_W * frac} height={12}
                rx={3} fill="#7b5cd6" opacity={r.completedAt ? 0.5 : 0.9}
                label={`connection #${r.id}: ${Math.round(frac * 100)}% delivered in order`} />
            )}

            {!waiting &&
              tcp.segments
                .filter((s) => s.rpcId === r.id)
                .map((s) => {
                  const sx = BAR_X + (s.seq / r.totalBytes) * BAR_W;
                  return (
                    <TitledRect key={s.id} x={sx} y={y + rowH / 2 - 3} width={4} height={6}
                      fill={s.lost ? "#d6456f" : "#c9ced6"} label={s.reason} />
                  );
                })}

            {!waiting && r.lostSeq >= 0 && (
              <text x={BAR_X + (r.lostSeq / r.totalBytes) * BAR_W - 4} y={y + rowH / 2 - 9}
                fontSize={11} fill="#d6456f" fontWeight={700}>
                !
                <title>head-of-line block: stream stalled until retransmit</title>
              </text>
            )}
          </g>
        );
      })}

      {rows.length === 0 && (
        <text x={16} y={TOP + 24} fontSize={12} fill="#9aa3af">
          press play to start
        </text>
      )}

      <rect x={8} y={TOP + AREA_H + 14} width={W - 16} height={8} rx={4} fill="#f5f6f8" stroke="#eef0f4" />
      <rect x={8} y={TOP + AREA_H + 14} width={(W - 16) * utilization} height={8} rx={4} fill="#7b5cd6" />
      <text x={8} y={TOP + AREA_H + 34} fontSize={10} fill="#9aa3af">
        shared link (fair shared, FIFO)
      </text>
      <text x={W - 8} y={H - 8} textAnchor="end" fontSize={11} fill="#9aa3af">
        t = {tcp.now}ms · {tcp.completedLatencies.length}/{tcp.rpcs.length} done
      </text>
    </svg>
  );
}
