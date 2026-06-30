interface LoopControlsProps {
  step: number;
  total: number;
  canBack: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

/** ‹ Back · Level N / M · Next › — the shared progressive-reveal controls. */
export function LoopControls({
  step,
  total,
  canBack,
  canNext,
  onPrev,
  onNext,
}: LoopControlsProps) {
  return (
    <div className="controls">
      <button onClick={onPrev} disabled={!canBack}>
        ‹ Back
      </button>
      <span className="indicator">
        Level {step} / {total}
      </span>
      <button onClick={onNext} disabled={!canNext}>
        Next ›
      </button>
    </div>
  );
}
