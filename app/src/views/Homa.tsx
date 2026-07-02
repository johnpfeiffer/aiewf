import { useMemo } from "react";
import { useHoma } from "../controllers/useHoma";
import { SCENES } from "../models/homa";
import { computeMetrics } from "../models/homa";
import { computeTcpMetrics } from "../models/homaTcp";
import { SceneTabs } from "../components/homa/SceneTabs";
import { RailYard, priorityColor, controlColor } from "../components/homa/RailYard";
import { TcpView } from "../components/homa/TcpView";
import { HomaControls } from "../components/homa/HomaControls";
import { MetricsPanel } from "../components/homa/HomaMetrics";
import { HomaOverlays } from "../components/homa/HomaOverlays";
import { SceneStub } from "../components/homa/SceneStub";
import "../components/homa/homa.css";

function Legend({ levels }: { levels: number }) {
  const items = Array.from({ length: levels }, (_, p) => p).reverse();
  return (
    <div className="homa-legend">
      {items.map((p) => (
        <span className="item" key={p}>
          <span className="swatch" style={{ background: priorityColor(p, levels) }} />
          P{p}{p === levels - 1 ? " unsched" : ""}
        </span>
      ))}
      <span className="item">
        <span className="swatch" style={{ background: controlColor("GRANT") }} />GRANT
      </span>
      <span className="item">
        <span className="swatch" style={{ background: controlColor("RESEND") }} />RESEND
      </span>
      <span className="item">
        <span className="swatch" style={{ background: controlColor("BUSY") }} />BUSY
      </span>
    </div>
  );
}

export default function Homa() {
  const h = useHoma();
  const spec = SCENES.find((s) => s.key === h.scene)!;
  const metrics = useMemo(() => computeMetrics(h.homa, h.config), [h.homa, h.config]);
  const tcpMetrics = useMemo(
    () => (h.tcp ? computeTcpMetrics(h.tcp, h.config) : null),
    [h.tcp, h.config],
  );

  return (
    <div className="homa">
      <SceneTabs scene={h.scene} onNavigate={h.setScene} />

      {spec.stub ? (
        <SceneStub spec={spec} />
      ) : (
        <>
          <p style={{ margin: "4px 0 10px", color: "#6b7280", fontSize: 13, maxWidth: 760 }}>
            {spec.blurb}
          </p>
          <HomaControls
            scene={h.scene}
            config={h.config}
            setConfig={h.setConfig}
            playing={h.playing}
            toggle={h.toggle}
            step={h.step}
            reset={h.reset}
            speed={h.speed}
            setSpeed={h.setSpeed}
            finished={h.homa.finished}
          />

          <div className="homa-layout" style={{ marginTop: 12 }}>
            <div>
              {h.scene === "tcp-vs-homa" && h.tcp ? (
                <div className="homa-split">
                  <div className="panel">
                    <h3>Homa</h3>
                    <div className="homa-viz" style={{ border: "none" }}>
                      <RailYard homa={h.homa} config={h.config} />
                    </div>
                  </div>
                  <div className="panel">
                    <h3>TCP</h3>
                    <div className="homa-viz" style={{ border: "none" }}>
                      <TcpView tcp={h.tcp} config={h.config} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="homa-viz">
                  <RailYard homa={h.homa} config={h.config} />
                  <Legend levels={h.config.priorityLevels} />
                </div>
              )}

              <HomaOverlays scene={h.scene} />
            </div>

            <div className="homa-side">
              <MetricsPanel
                metrics={metrics}
                events={h.homa.events}
                config={h.config}
                tcp={h.scene === "tcp-vs-homa" ? tcpMetrics : null}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
