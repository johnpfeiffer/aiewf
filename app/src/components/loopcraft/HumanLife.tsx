import { HUMAN_SUMMARY, LOOPS } from "../../models/loopcraft";
import { TopRow } from "./TopRow";

interface HumanLifeProps {
  step: number;
  forward: boolean;
}

/**
 * Human-life view: the same six loops, lived as a human life. Each AI loop
 * maps to its human analogue (heartbeats ≈ token loop, …, civilization ≈
 * software factories). Rows reveal inner-first; the newest row rises in.
 */
export function HumanLife({ step, forward }: HumanLifeProps) {
  const visible = LOOPS.filter((L) => L.n <= step);
  const current = LOOPS[step - 1];

  return (
    <>
      <TopRow pills={HUMAN_SUMMARY} step={step} forward={forward} />
      <p className="sub">{current?.human.story ?? ""}</p>
      <div className="rows">
        {visible.map((L) => {
          const H = L.human;
          const isNew = forward && L.n === step;
          return (
            <div
              key={L.key}
              className={"row" + (isNew ? " enter" : "")}
              style={
                { "--accent": L.color, "--bg": L.bg } as React.CSSProperties
              }
            >
              <div className="ai">
                <span className="n">{L.n}</span>
                <span className="ai-name">{L.name}</span>
              </div>
              <span className="approx">≈</span>
              <div className="hu">
                <div className="hu-head">
                  <span className="hu-name">{H.name}</span>
                  <span className="hu-exit">exit: {H.exit}</span>
                </div>
                <div className="hu-verbs">
                  {H.verbs}
                  {H.multi && (
                    <>
                      {"\u00a0"}
                      <span className="badge">multi-agent</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
