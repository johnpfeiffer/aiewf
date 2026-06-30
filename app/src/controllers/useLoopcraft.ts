import { useCallback, useEffect, useState } from "react";
import { SECTION_TOTAL, SectionKey } from "../models/loopcraft";

export interface UseLoopcraft {
  section: SectionKey;
  step: number;
  /** true when the most recent advance revealed a new (outer) level */
  forward: boolean;
  canBack: boolean;
  canNext: boolean;
  next: () => void;
  prev: () => void;
  setStep: (step: number) => void;
  setSection: (section: SectionKey) => void;
}

interface LoopcraftState {
  section: SectionKey;
  step: number;
  forward: boolean;
}

/**
 * Progressive-reveal stepper for the Loopcraft module.
 * Reveals levels inner-first: step 1 shows level 1 only, step N shows 1..N.
 *
 * Advance: click anywhere / Next button / → or Space. Back: ‹ Back button / ←.
 * Ported from the original stepper.js.
 */
export function useLoopcraft(): UseLoopcraft {
  const [state, setState] = useState<LoopcraftState>({
    section: "intro",
    step: 1,
    forward: false,
  });

  const { section, step, forward } = state;
  const total = SECTION_TOTAL[section];

  const next = useCallback(() => {
    setState((s) => {
      if (s.section === "intro") {
        return { section: "nested", step: 1, forward: true };
      }
      const max = SECTION_TOTAL[s.section];
      const ns = Math.min(max, s.step + 1);
      return { ...s, step: ns, forward: ns > s.step };
    });
  }, []);

  const prev = useCallback(() => {
    setState((s) => {
      if (s.section === "intro") return s;
      const ns = Math.max(1, s.step - 1);
      return { ...s, step: ns, forward: false };
    });
  }, []);

  const setStep = useCallback((target: number) => {
    setState((s) => {
      const max = SECTION_TOTAL[s.section];
      const ns = Math.max(1, Math.min(max, target));
      return { ...s, step: ns, forward: ns > s.step };
    });
  }, []);

  const setSection = useCallback((sec: SectionKey) => {
    setState({ section: sec, step: 1, forward: false });
  }, []);

  // keyboard + click-anywhere-to-advance, matching the original stepper.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      }
    };
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.closest("button") || target.closest("a"))) return;
      next();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [next, prev]);

  const canBack = section !== "intro" && step > 1;
  const canNext = section === "intro" || step < total;

  return {
    section,
    step,
    forward,
    canBack,
    canNext,
    next,
    prev,
    setStep,
    setSection,
  };
}
