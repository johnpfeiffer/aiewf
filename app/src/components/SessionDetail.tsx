import { Box, Chip, IconButton, Link, Paper, Stack, Typography } from "@mui/material";
import {
  ScheduleSession,
  TYPE_LABEL,
  formatTimeRange,
} from "../models/session";
import { linkify } from "../lib/linkify";

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
          {session.videoUrl && (
            <>
              {" "}
              <Link
                href={session.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                variant="body2"
              >
                Watch video
              </Link>
            </>
          )}
        </Typography>
        {hasSpeakers && (
          <Stack spacing={1}>
            <Typography variant="subtitle2" component="h3">
              Speakers
            </Typography>
            {session.speakers.map((speaker) => (
              <Box key={speaker.name}>
                <Typography variant="body2">
                  <strong>{speaker.name}</strong>
                  {speaker.role ? ` — ${speaker.role}` : ""}
                </Typography>
                {speaker.bio && (
                  <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "pre-line", display: "block", mt: 0.25 }}>
                    {speaker.bio}
                  </Typography>
                )}
              </Box>
            ))}
          </Stack>
        )}
        {hasDescription && (
          <Box
            sx={{
              borderTop: "1px solid",
              borderColor: "divider",
              pt: 1.5,
              mt: hasSpeakers ? 0.5 : 0,
            }}
          >
            <Typography variant="subtitle2" component="h3" sx={{ mb: 0.5 }}>
              Session Description
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-line" }}>
              {linkify(session.description).map((part, index) =>
                part.type === "link" ? (
                  <Link
                    key={index}
                    href={part.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {part.value}
                  </Link>
                ) : (
                  part.value
                ),
              )}
            </Typography>
          </Box>
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
