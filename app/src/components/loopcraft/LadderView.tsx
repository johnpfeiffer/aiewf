import { useEffect, useState } from "react";
import { Loop, LOOPS } from "../../models/loopcraft";

interface LadderViewProps {
  step: number;
}

const INDENT = 34; // px per nesting level
const ROW_H = 52; // px per line
const BAR_BASE = 8; // left offset of outermost bar
const TEXT_GAP = 22; // gap from a loop's bar to its code text
const PAD_TOP = 28; // matches .ladder padding-top

const BY_OUTER = [...LOOPS].sort((a, b) => b.n - a.n); // loop 6 -> loop 1
const EMIT_LOOP = LOOPS.find((l) => l.body);

/**
 * While-loop ladder: every loop is a `while` whose body is the loop below it.
 * Rows + bars are built once; advancing re-indents and reveals them.
 */
export function LadderView({ step }: LadderViewProps) {
  // enable transitions only after first paint (avoids a load-time collapse)
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(r);
  }, []);

  const tail = (L: Loop) => (L.tag ? `${L.tag} · ${L.tick}` : L.tick);

  return (
    <div className={"ladder" + (animate ? " animate" : "")}>
      {BY_OUTER.map((L) => {
        const visible = L.n <= step;
        const depth = Math.max(0, step - L.n);
        return (
          <div
            key={L.key}
            className="row"
            style={{
              height: visible ? ROW_H : 0,
              opacity: visible ? 1 : 0,
            }}
          >
            <div
              className="code"
              style={{ paddingLeft: BAR_BASE + depth * INDENT + TEXT_GAP }}
            >
              <span className="kw" style={{ color: L.color }}>
                while
              </span>{" "}
              {L.not && (
                <>
                  <span className="kw">not</span>{" "}
                </>
              )}
              <span style={{ color: L.color }}>{L.cond}</span>
              <span className="kw">:</span>
            </div>
            <div className="tick">
              <span className="meta">
                loop {L.n} ·{" "}
                <span className="name" style={{ color: L.color }}>
                  {L.name}
                </span>{" "}
                · {tail(L)}
              </span>
              {L.note && <span className="note">{L.note}</span>}
            </div>
          </div>
        );
      })}

      {/* innermost body line (only the token loop carries one) */}
      {EMIT_LOOP && (
        <div
          className="row"
          style={{ height: ROW_H, opacity: 1 }}
        >
          <div
            className="code"
            style={{ paddingLeft: BAR_BASE + step * INDENT + TEXT_GAP }}
          >
            {EMIT_LOOP.body}
          </div>
        </div>
      )}

      {/* nesting bars, one per loop */}
      {BY_OUTER.map((L) => {
        const visible = L.n <= step;
        const depth = Math.max(0, step - L.n);
        return (
          <div
            key={L.key}
            className="bar"
            style={{
              background: L.color,
              bottom: 20,
              opacity: visible ? 1 : 0,
              left: BAR_BASE + depth * INDENT,
              top: PAD_TOP + depth * ROW_H + ROW_H * 0.28,
            }}
          />
        );
      })}
    </div>
  );
}
