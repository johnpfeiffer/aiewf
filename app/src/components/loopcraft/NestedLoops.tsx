import { Fragment } from "react";
import {
  Loop,
  LoopNode,
  LOOPS,
  SUMMARY,
  colorOf,
} from "../../models/loopcraft";
import { TopRow } from "./TopRow";

interface NestedLoopsProps {
  step: number;
  forward: boolean;
}

function nodeStyle(loop: Loop, nd: LoopNode): React.CSSProperties {
  if (nd.cls === "ok") return { color: loop.color, borderColor: loop.color };
  if (nd.cls === "bad") return { color: colorOf("goal"), borderColor: colorOf("goal") };
  return {};
}

/**
 * Nested-boxes view: each level wraps the one below it (outer = bigger loop).
 * step k shows loops 1..k, with loop k as the outermost ring.
 */
function buildLoop(i: number, outer: number, forward: boolean): React.JSX.Element {
  const L = LOOPS[i];
  const isOuter = i === outer;
  return (
    <section
      className={"loop" + (isOuter && forward ? " enter" : "")}
      style={
        {
          "--accent": L.color,
          background: L.bg,
        } as React.CSSProperties
      }
    >
      <div className="loop-header">
        <span className="loop-label">
          {L.n} · {L.name} · <span className="verb">{L.verbs}</span>
        </span>
        <span className="loop-exit">
          exit: {L.exit} · {L.timescale}
        </span>
      </div>
      {L.sub && <p className="loop-sub">{L.sub}</p>}
      {L.nodes && (
        <div className="nodes">
          {L.nodes.map((nd, idx) => (
            <Fragment key={idx}>
              {nd.sep && <span className="sep">{nd.sep}</span>}
              <span
                className={"node" + (nd.cls && nd.cls !== "cursor" ? " " + nd.cls : "")}
                style={nodeStyle(L, nd)}
              >
                {nd.cls === "cursor" ? <span className="cursor" /> : nd.label}
              </span>
            </Fragment>
          ))}
        </div>
      )}
      {i > 0 && buildLoop(i - 1, outer, forward)}
    </section>
  );
}

export function NestedLoops({ step, forward }: NestedLoopsProps) {
  return (
    <>
      <TopRow pills={SUMMARY} step={step} forward={forward} />
      <div>{buildLoop(step - 1, step - 1, forward)}</div>
    </>
  );
}
