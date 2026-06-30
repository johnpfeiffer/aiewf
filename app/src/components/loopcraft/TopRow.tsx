import { Fragment } from "react";
import {
  SummaryPill,
  bgOf,
  colorOf,
  nOf,
} from "../../models/loopcraft";

interface TopRowProps {
  pills: SummaryPill[];
  step: number;
  forward: boolean;
}

/**
 * The arc of summary pills above the nested and human views. Pills reveal in
 * sync with their level; the newest pill (and its arrow) get the `enter` pop.
 */
export function TopRow({ pills, step, forward }: TopRowProps) {
  const visible = pills.filter((p) => nOf(p.color) <= step);
  return (
    <div className="toprow">
      {visible.map((p, i) => {
        const isNew = forward && nOf(p.color) === step;
        return (
          <Fragment key={p.label}>
            {i > 0 && <span className={"arrow" + (isNew ? " enter" : "")}>→</span>}
            <span className="pill-cell">
              <span
                className={"pill" + (isNew ? " enter" : "")}
                style={{
                  color: colorOf(p.color),
                  background: p.caption ? bgOf(p.color) : undefined,
                }}
              >
                {p.label}
              </span>
              {p.caption && (
                <span className="toprow-caption" style={{ color: colorOf(p.color) }}>
                  {p.caption}
                </span>
              )}
            </span>
          </Fragment>
        );
      })}
    </div>
  );
}
