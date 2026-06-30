import { useLoopcraft } from "../controllers/useLoopcraft";
import { CURVE_STEPS, SECTIONS, SectionKey } from "../models/loopcraft";
import { LoopNav } from "../components/loopcraft/LoopNav";
import { LoopControls } from "../components/loopcraft/LoopControls";
import { NestedLoops } from "../components/loopcraft/NestedLoops";
import { LadderView } from "../components/loopcraft/LadderView";
import { HumanLife } from "../components/loopcraft/HumanLife";
import { StressCurves } from "../components/loopcraft/StressCurves";
import { SummitView } from "../components/loopcraft/SummitView";
import "../components/loopcraft/loopcraft.css";

interface SectionRenderProps {
  section: SectionKey;
  step: number;
  forward: boolean;
}

function SectionRender({ section, step, forward }: SectionRenderProps) {
  switch (section) {
    case "nested":
      return <NestedLoops step={step} forward={forward} />;
    case "ladder":
      return <LadderView step={step} />;
    case "human":
      return <HumanLife step={step} forward={forward} />;
    case "curves":
      return <StressCurves step={step} />;
    case "summit":
      return <SummitView step={step} forward={forward} />;
    default:
      return null;
  }
}

function Intro({ onBegin }: { onBegin: () => void }) {
  return (
    <div className="intro">
      <h1>The Highest Loop</h1>
      <div className="by">swyx</div>
      <p className="hint">
        Press <strong>→</strong> or{" "}
        <a
          href="#begin"
          onClick={(e) => {
            e.preventDefault();
            onBegin();
          }}
        >
          begin ›
        </a>
      </p>
    </div>
  );
}

/**
 * Loopcraft — an interactive copy of swyx's "The Highest Loop" deck
 * (loopcraft.swyxio.workers.dev). Six sections, progressive-reveal levels,
 * keyboard / click / button navigation. Rendered inside the AIEWF app when the
 * user switches to the Loopcraft view.
 */
export default function Loopcraft() {
  const lc = useLoopcraft();
  const section = SECTIONS.find((s) => s.key === lc.section)!;
  const heading =
    lc.section === "curves" ? CURVE_STEPS[lc.step - 1].heading : section.heading;

  return (
    <div className="loopcraft">
      {lc.section !== "intro" && (
        <LoopNav section={lc.section} onNavigate={lc.setSection} />
      )}

      {lc.section === "intro" ? (
        <Intro onBegin={() => lc.setSection("nested")} />
      ) : (
        <>
          <h1>{heading}</h1>
          <LoopControls
            step={lc.step}
            total={section.total}
            canBack={lc.canBack}
            canNext={lc.canNext}
            onPrev={lc.prev}
            onNext={lc.next}
          />
          <SectionRender
            section={lc.section}
            step={lc.step}
            forward={lc.forward}
          />
        </>
      )}
    </div>
  );
}
