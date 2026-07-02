import { SceneSpec } from "../../models/homa";

interface SceneStubProps {
  spec: SceneSpec;
}

/** Placeholder for the three scenes beyond the MVP (preemption, incast, failure).
 *  The simulation engine already supports them; the interactive lab UI is
 *  intentionally out of scope for v1. */
export function SceneStub({ spec }: SceneStubProps) {
  return (
    <div className="homa-stub">
      <span className="badge">Planned · not in v1</span>
      <h2>{spec.label}</h2>
      <p>{spec.blurb}</p>
    </div>
  );
}
