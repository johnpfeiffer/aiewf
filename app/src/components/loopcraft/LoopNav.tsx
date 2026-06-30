import { SECTIONS, SectionKey } from "../../models/loopcraft";

interface LoopNavProps {
  section: SectionKey;
  onNavigate: (section: SectionKey) => void;
}

/** Top section nav: Title · Nested loops · While-loop ladder · Human life · … */
export function LoopNav({ section, onNavigate }: LoopNavProps) {
  return (
    <nav aria-label="Loopcraft sections">
      {SECTIONS.map((s) => (
        <a
          key={s.key}
          className={s.key === section ? "active" : undefined}
          aria-current={s.key === section ? "page" : undefined}
          onClick={(e) => {
            e.preventDefault();
            onNavigate(s.key);
          }}
        >
          {s.label}
        </a>
      ))}
    </nav>
  );
}
