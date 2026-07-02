import {
  Box,
  Button,
  Divider,
  FormControlLabel,
  MenuItem,
  Select,
  Slider,
  Stack,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { HomaConfig, Scene, WORKLOADS } from "../../models/homa";
import { Speed } from "../../controllers/useHoma";

interface HomaControlsProps {
  scene: Scene;
  config: HomaConfig;
  setConfig: (patch: Partial<HomaConfig>) => void;
  playing: boolean;
  toggle: () => void;
  step: () => void;
  reset: () => void;
  speed: Speed;
  setSpeed: (s: Speed) => void;
  finished: boolean;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Box sx={{ px: 1 }}>{children}</Box>
    </Box>
  );
}

export function HomaControls({
  scene,
  config,
  setConfig,
  playing,
  toggle,
  step,
  reset,
  speed,
  setSpeed,
  finished,
}: HomaControlsProps) {
  const show = (s: Scene[]) => s.includes(scene);

  return (
    <Stack spacing={2} direction={{ xs: "column", md: "row" }} alignItems="flex-start" flexWrap="wrap">
      <Stack direction="row" spacing={1} alignItems="center">
        <Button variant="contained" size="small" onClick={toggle} disabled={finished && !playing}>
          {playing ? "Pause" : "Play"}
        </Button>
        <Button variant="outlined" size="small" onClick={step} disabled={playing || finished}>
          Step
        </Button>
        <Button variant="outlined" size="small" onClick={reset}>
          Replay
        </Button>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={speed}
          onChange={(_e, v: Speed | null) => v && setSpeed(v)}
          aria-label="Simulation speed"
        >
          <ToggleButton value={1}>1×</ToggleButton>
          <ToggleButton value={4}>4×</ToggleButton>
          <ToggleButton value={8}>8×</ToggleButton>
          <ToggleButton value={16}>16×</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      <Divider orientation="vertical" flexItem />

      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
        {show(["tcp-vs-homa", "overcommitment"]) && (
          <Row label="Workload">
            <Select
              size="small"
              value={config.workload}
              onChange={(e) => setConfig({ workload: e.target.value as HomaConfig["workload"] })}
              aria-label="Workload distribution"
            >
              {WORKLOADS.map((w) => (
                <MenuItem key={w.key} value={w.key}>
                  {w.label}
                </MenuItem>
              ))}
            </Select>
          </Row>
        )}

        {show(["tcp-vs-homa", "overcommitment"]) && (
          <Row label={`Senders: ${config.senderCount}`}>
            <Slider
              size="small"
              min={3}
              max={8}
              step={1}
              value={config.senderCount}
              onChange={(_e, v) => setConfig({ senderCount: v as number })}
              valueLabelDisplay="auto"
              sx={{ width: 120 }}
            />
          </Row>
        )}

        {show(["blind-send", "priority-queues", "overcommitment", "tcp-vs-homa"]) && (
          <Row label={`RTTbytes (unscheduled): ${config.rttBytes}`}>
            <Slider
              size="small"
              min={500}
              max={6000}
              step={500}
              value={config.rttBytes}
              onChange={(_e, v) => setConfig({ rttBytes: v as number })}
              valueLabelDisplay="auto"
              sx={{ width: 140 }}
            />
          </Row>
        )}

        {show(["blind-send", "priority-queues", "overcommitment", "tcp-vs-homa"]) && (
          <Row label={`Priority levels: ${config.priorityLevels}`}>
            <Slider
              size="small"
              min={4}
              max={16}
              step={1}
              value={config.priorityLevels}
              onChange={(_e, v) => {
                const pl = v as number;
                setConfig({ priorityLevels: pl, overcommitment: Math.min(config.overcommitment, pl - 1) });
              }}
              valueLabelDisplay="auto"
              sx={{ width: 120 }}
            />
          </Row>
        )}

        {show(["blind-send", "priority-queues", "overcommitment"]) && (
          <Row label={`Overcommitment: ${config.overcommitment}`}>
            <Slider
              size="small"
              min={1}
              max={Math.max(1, config.priorityLevels - 1)}
              step={1}
              value={config.overcommitment}
              onChange={(_e, v) => setConfig({ overcommitment: v as number })}
              valueLabelDisplay="auto"
              sx={{ width: 120 }}
            />
          </Row>
        )}

        {show(["priority-queues"]) && (
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={config.packetSpray}
                onChange={(_e, v) => setConfig({ packetSpray: v })}
              />
            }
            label="Packet spray"
          />
        )}

        {show(["tcp-vs-homa"]) && (
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={config.faultLoss}
                onChange={(_e, v) => setConfig({ faultLoss: v })}
              />
            }
            label="Inject loss"
          />
        )}
      </Stack>
    </Stack>
  );
}
