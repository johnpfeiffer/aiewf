import { Fragment } from "react";
import {
  SHOT_SRC,
  SUMMIT,
  SUMMIT_ARC,
  SUMMIT_HREF,
  SummitCard,
  SummitFinale,
  SummitIntro,
  colorOf,
} from "../../models/loopcraft";

interface SummitViewProps {
  step: number;
  forward: boolean;
}

const INTRO = SUMMIT[0] as SummitIntro;
const CARD_1 = SUMMIT[1] as SummitCard;
const CARD_2 = SUMMIT[2] as SummitCard;
const FINALE = SUMMIT[3] as SummitFinale;

/** Highlight while/not/in keywords (the only keywords used in the summit code). */
function highlightCode(line: string): React.JSX.Element[] {
  const regex = /\b(while|not|in)\b/g;
  const out: React.JSX.Element[] = [];
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(line)) !== null) {
    if (m.index > last) {
      out.push(<Fragment key={key++}>{line.slice(last, m.index)}</Fragment>);
    }
    out.push(
      <span key={key++} className="kw">
        {m[0]}
      </span>,
    );
    last = m.index + m[0].length;
  }
  if (last < line.length) {
    out.push(<Fragment key={key++}>{line.slice(last)}</Fragment>);
  }
  return out;
}

function Arc({ resolved }: { resolved: boolean }) {
  return (
    <div className="arc">
      {SUMMIT_ARC.map((p, i) => (
        <Fragment key={p.label}>
          {i > 0 && <span className="arrow">→</span>}
          <span className="pill dim" style={{ color: colorOf(p.color) }}>
            {p.label}
          </span>
        </Fragment>
      ))}
      <span className="arrow">→</span>
      <span className="pill q">{resolved ? "Summits" : "?"}</span>
    </div>
  );
}

function Card({ data, rise }: { data: SummitCard; rise: boolean }) {
  return (
    <div
      className={"card" + (rise ? " rise" : "")}
      style={{ "--accent": data.color } as React.CSSProperties}
    >
      <div className="eyebrow">{data.eyebrow}</div>
      <div className="name">{data.name}</div>
      <pre>
        {data.code.map((ln, i) => (
          <Fragment key={i}>
            {highlightCode(ln)}
            {i < data.code.length - 1 && "\n"}
          </Fragment>
        ))}
      </pre>
      <div className="foot">{data.foot}</div>
    </div>
  );
}

/**
 * Summit view: the punchline. The arc ends in "?" which resolves to "Summits";
 * the AI Engineer Summit and the World's Fair rise in as the loops above all
 * loops, ending in the finale.
 */
export function SummitView({ step, forward }: SummitViewProps) {
  if (step === 1) {
    return (
      <div className="stage">
        <Arc resolved={false} />
        <div className="kicker">{INTRO.kicker}</div>
        <div className="line">{INTRO.line}</div>
        <div className="ask">{INTRO.ask}</div>
      </div>
    );
  }

  return (
    <div className="stage">
      <Arc resolved />
      {step >= 2 && <Card data={CARD_1} rise={forward && step === 2} />}
      {step >= 3 && <Card data={CARD_2} rise={forward && step === 3} />}
      {step >= 4 && (
        <div className="finale">
          <div className="big">{FINALE.title}</div>
          <div className="punch">{FINALE.punch}</div>
          <div className="wink">{FINALE.wink}</div>
          <a className="shotlink" href={SUMMIT_HREF} target="_blank" rel="noopener noreferrer">
            <img
              className="shot"
              src={SHOT_SRC}
              alt="AI Engineer World's Fair — the highest loop"
            />
          </a>
        </div>
      )}
    </div>
  );
}
