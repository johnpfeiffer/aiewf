import { Scene, SCENES } from "../../models/homa";

interface SceneTabsProps {
  scene: Scene;
  onNavigate: (s: Scene) => void;
}

/** Row of scene tabs. Active scenes are solid; stubbed scenes are dashed. */
export function SceneTabs({ scene, onNavigate }: SceneTabsProps) {
  return (
    <div className="homa-scene-tabs" role="tablist" aria-label="Homa scenes">
      {SCENES.map((s) => (
        <button
          key={s.key}
          type="button"
          role="tab"
          aria-selected={s.key === scene}
          className={`homa-scene-tab${s.key === scene ? " active" : ""}${
            s.stub ? " stub" : ""
          }`}
          onClick={() => onNavigate(s.key)}
        >
          {s.label}
          <span className="tag">{s.stub ? "soon" : ""}</span>
        </button>
      ))}
    </div>
  );
}
