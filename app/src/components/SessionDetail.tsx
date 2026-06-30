import { Box, Chip, IconButton, Paper, Stack, Typography } from "@mui/material";
import {
  ScheduleSession,
  TYPE_LABEL,
  formatTimeRange,
} from "../models/session";

interface SessionDetailProps {
  session?: ScheduleSession;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  conflictsWithFavorite?: boolean;
}

export function SessionDetail({
  session,
  isFavorite,
  onToggleFavorite,
  conflictsWithFavorite,
}: SessionDetailProps) {
  if (!session) {
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography color="text.secondary">Select a session to see details.</Typography>
      </Paper>
    );
  }

  const hasSpeakers = session.speakers.length > 0;
  const hasDescription = session.description.trim().length > 0;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderColor: conflictsWithFavorite ? "error.main" : "divider",
        borderWidth: conflictsWithFavorite ? 2 : 1,
      }}
    >
      <Stack spacing={1}>
        <Stack direction="row" gap={0.5} flexWrap="wrap" alignItems="center">
          <Chip size="small" label={TYPE_LABEL[session.type]} color="primary" />
          <Typography variant="caption" color="text.secondary">
            {formatTimeRange(session)}
          </Typography>
          {session.tentative && (
            <Chip size="small" label="tentative" variant="outlined" color="warning" />
          )}
          {conflictsWithFavorite && (
            <Chip size="small" label="conflict" color="error" />
          )}
        </Stack>
        <Typography variant="h5" component="h2">
          {session.title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {session.track}
        </Typography>
        {hasSpeakers && (
          <Stack spacing={0.5}>
            {session.speakers.map((speaker) => (
              <Typography key={speaker.name} variant="body2">
                <strong>{speaker.name}</strong>
                {speaker.role ? ` — ${speaker.role}` : ""}
              </Typography>
            ))}
          </Stack>
        )}
        {hasDescription && (
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-line" }}>
            {session.description}
          </Typography>
        )}
        <Box>
          <IconButton
            aria-label={isFavorite ? "Remove from My Schedule" : "Add to My Schedule"}
            onClick={() => onToggleFavorite(session.id)}
            sx={{ color: isFavorite ? "warning.main" : "text.disabled" }}
          >
            <span style={{ fontSize: "1.3rem", lineHeight: 1 }}>{isFavorite ? "★" : "☆"}</span>
          </IconButton>
        </Box>
      </Stack>
    </Paper>
  );
}
