import { useState } from "react";
import {
  Box,
  Chip,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  ScheduleSession,
  TYPE_LABEL,
  durationLabel,
  formatTimeRange,
} from "../models/session";

interface SessionCardProps {
  session: ScheduleSession;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  conflictsWithFavorite?: boolean;
}

const typeColor: Record<
  ScheduleSession["type"],
  { bg: string; fg: string }
> = {
  KEYNOTE: { bg: "#1e293b", fg: "#f8fafc" },
  SESSION: { bg: "#2d4ba8", fg: "#ffffff" },
  SPONSOR: { bg: "#c2410c", fg: "#ffffff" },
  WORKSHOP: { bg: "#6a4c93", fg: "#ffffff" },
};

export function SessionCard({
  session,
  isFavorite,
  onToggleFavorite,
  conflictsWithFavorite,
}: SessionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const palette = typeColor[session.type];
  const hasDescription = session.description.trim().length > 0;
  const hasSpeakers = session.speakers.length > 0;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        borderColor: conflictsWithFavorite ? "#dc2626" : undefined,
        borderWidth: conflictsWithFavorite ? 2 : 1,
      }}
    >
      <Stack direction="row" justifyContent="space-between" gap={1} alignItems="flex-start">
        <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" gap={0.5} flexWrap="wrap" alignItems="center">
            <Chip
              size="small"
              label={TYPE_LABEL[session.type]}
              sx={{ bgcolor: palette.bg, color: palette.fg, fontWeight: 600 }}
            />
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              {formatTimeRange(session)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              · {durationLabel(session)}
            </Typography>
            {session.tentative && (
              <Chip size="small" label="tentative" variant="outlined" sx={{ borderColor: "#a16207", color: "#a16207" }} />
            )}
            {conflictsWithFavorite && (
              <Chip size="small" label="conflict" sx={{ bgcolor: "#dc2626", color: "#fff", fontWeight: 600 }} />
            )}
          </Stack>
          <Typography variant="h3" component="h3">
            {session.title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {session.track}
          </Typography>
          {hasSpeakers && (
            <Stack spacing={0.25}>
              {session.speakers.map((speaker) => (
                <Typography key={speaker.name} variant="caption" color="text.primary">
                  <strong>{speaker.name}</strong>
                  {speaker.role ? ` — ${speaker.role}` : ""}
                </Typography>
              ))}
            </Stack>
          )}
          {hasDescription && (
            <Box sx={{ mt: 0.5 }}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  display: expanded ? "block" : "-webkit-box",
                  WebkitLineClamp: expanded ? undefined : 2,
                  WebkitBoxOrient: "vertical",
                  overflow: expanded ? "visible" : "hidden",
                }}
              >
                {session.description}
              </Typography>
              <Box>
                <button
                  type="button"
                  onClick={() => setExpanded((value) => !value)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    color: "#2d4ba8",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                  }}
                >
                  {expanded ? "Show less" : "Show more"}
                </button>
              </Box>
            </Box>
          )}
        </Stack>
        <Tooltip title={isFavorite ? "Remove from My Schedule" : "Add to My Schedule"}>
          <IconButton
            aria-label={isFavorite ? "Remove from My Schedule" : "Add to My Schedule"}
            onClick={() => onToggleFavorite(session.id)}
            size="small"
            sx={{ color: isFavorite ? "#f59e0b" : "text.disabled" }}
          >
            <span style={{ fontSize: "1.3rem", lineHeight: 1 }}>{isFavorite ? "★" : "☆"}</span>
          </IconButton>
        </Tooltip>
      </Stack>
    </Paper>
  );
}
