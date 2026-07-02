import { useCallback, useEffect, useRef, useState } from "react";
import {
  Arrival,
  DEFAULT_CONFIG,
  HomaConfig,
  HomaState,
  Scene,
  buildArrivals,
  initHoma,
  initIncast,
  stepHoma,
} from "../models/homa";
import { TcpState, initTcp, stepTcp } from "../models/homaTcp";

export type Speed = 1 | 4 | 8 | 16;

export interface UseHoma {
  scene: Scene;
  setScene: (s: Scene) => void;
  config: HomaConfig;
  setConfig: (patch: Partial<HomaConfig>) => void;
  seed: number;
  homa: HomaState;
  tcp: TcpState | null;
  playing: boolean;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  step: () => void;
  reset: () => void;
  speed: Speed;
  setSpeed: (s: Speed) => void;
}

/** Per-scene arrival schedule so each scene teaches a specific idea. */
function arrivalsFor(scene: Scene, cfg: HomaConfig, seed: number): Arrival[] {
  switch (scene) {
    case "blind-send":
      // One long RPC: watch the unscheduled burst, then grants drive the rest.
      return [{ at: 0, senderId: "s0", size: 30000 }];
    case "priority-queues":
      // Two long RPCs fill the TOR queues; tiny RPCs arrive later and jump ahead.
      return [
        { at: 0, senderId: "s0", size: 45000 },
        { at: 0, senderId: "s1", size: 45000 },
        { at: 24, senderId: "s2", size: 1500 },
        { at: 30, senderId: "s3", size: 1500 },
      ];
    case "incast":
      // incast uses initIncast directly; this is a fallback.
      return buildArrivals(cfg, seed, 30).arrivals;
    case "overcommitment":
    case "tcp-vs-homa":
      return buildArrivals(cfg, seed, 40).arrivals;
    default:
      return buildArrivals(cfg, seed, 30).arrivals;
  }
}

function buildStates(
  scene: Scene,
  cfg: HomaConfig,
  seed: number,
): { homa: HomaState; tcp: TcpState | null } {
  if (scene === "incast") {
    return { homa: initIncast(cfg, seed), tcp: null };
  }
  const arrivals = arrivalsFor(scene, cfg, seed);
  const homa = initHoma(cfg, seed, arrivals);
  const tcp = scene === "tcp-vs-homa" ? initTcp(cfg, seed, arrivals) : null;
  return { homa, tcp };
}

export function useHoma(): UseHoma {
  const [scene, setSceneState] = useState<Scene>("tcp-vs-homa");
  const [config, setConfigState] = useState<HomaConfig>(DEFAULT_CONFIG);
  const [seed] = useState(1);
  const [speed, setSpeed] = useState<Speed>(8);
  const [playing, setPlaying] = useState(false);
  const [{ homa, tcp }, setStates] = useState(() =>
    buildStates("tcp-vs-homa", DEFAULT_CONFIG, 1),
  );

  const configRef = useRef(config);
  configRef.current = config;
  const sceneRef = useRef(scene);
  sceneRef.current = scene;

  // Re-init when the scene or a structural control changes (not on live controls).
  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    setPlaying(false);
    setStates(buildStates(sceneRef.current, configRef.current, seed));
  }, [scene, config.senderCount, config.workload, config.incastFanIn, seed]);

  const setScene = useCallback((s: Scene) => {
    setSceneState(s);
  }, []);

  const setConfig = useCallback((patch: Partial<HomaConfig>) => {
    setConfigState((c) => ({ ...c, ...patch }));
  }, []);

  const reset = useCallback(() => {
    setPlaying(false);
    setStates(buildStates(sceneRef.current, configRef.current, seed));
  }, [seed]);

  const play = useCallback(() => setPlaying(true), []);
  const pause = useCallback(() => setPlaying(false), []);
  const toggle = useCallback(() => setPlaying((p) => !p), []);
  const step = useCallback(() => {
    setStates(({ homa: h, tcp: t }) => {
      const c = configRef.current;
      const nh = h.finished ? h : stepHoma(h, c);
      const nt = t && !t.finished ? stepTcp(t, c) : t;
      return { homa: nh, tcp: nt };
    });
  }, []);

  // play loop: advance `speed` ticks per animation frame
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const loop = () => {
      const c = configRef.current;
      setStates(({ homa: h, tcp: t }) => {
        let nh = h;
        for (let i = 0; i < speed; i++) {
          if (nh.finished) break;
          nh = stepHoma(nh, c);
        }
        let nt = t;
        if (t) {
          for (let i = 0; i < speed; i++) {
            if (nt!.finished) break;
            nt = stepTcp(nt!, c);
          }
        }
        return { homa: nh, tcp: nt };
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed]);

  // auto-pause when the sim finishes
  useEffect(() => {
    if (homa.finished && (!tcp || tcp.finished)) setPlaying(false);
  }, [homa.finished, tcp]);

  return {
    scene,
    setScene,
    config,
    setConfig,
    seed,
    homa,
    tcp,
    playing,
    play,
    pause,
    toggle,
    step,
    reset,
    speed,
    setSpeed,
  };
}
