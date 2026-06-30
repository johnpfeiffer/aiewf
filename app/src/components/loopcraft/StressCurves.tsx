import { CURVE_STEPS } from "../../models/loopcraft";

interface StressCurvesProps {
  step: number;
}

/**
 * Stress-curve view: five pre-rendered chart images cross-fade as you step.
 * Steps 1–4 build the AIEWF Stress Level Index year by year; step 5 is the
 * Sales-pace Lorenz curves.
 */
export function StressCurves({ step }: StressCurvesProps) {
  const cur = CURVE_STEPS[step - 1];
  return (
    <>
      <p className="sub">{cur.caption}</p>
      <div className="frame">
        {CURVE_STEPS.map((s, i) => (
          <img
            key={s.src}
            src={s.src}
            alt={`${s.heading} — step ${i + 1}`}
            className={i === step - 1 ? "show" : undefined}
          />
        ))}
      </div>
    </>
  );
}
