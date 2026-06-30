import { Box, Typography } from "@mui/material";
import { ScheduleSession } from "../models/session";
import { SessionCard } from "./SessionCard";

interface TimeGroupProps {
  startLabel: string;
  sessions: ScheduleSession[];
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  conflictIds: Set<string>;
}

export function TimeGroup({
  startLabel,
  sessions,
  isFavorite,
  onToggleFavorite,
  conflictIds,
}: TimeGroupProps) {
  return (
    <Box>
      <Typography
        variant="h2"
        component="h2"
        sx={{
          position: "sticky",
          top: 0,
          bgcolor: "background.default",
          py: 0.5,
          zIndex: 1,
        }}
      >
        {startLabel}
        <Typography
          component="span"
          color="text.secondary"
          sx={{ ml: 1, fontSize: "0.85rem" }}
        >
          {sessions.length} {sessions.length === 1 ? "session" : "sessions"}
        </Typography>
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr", xl: "1fr 1fr 1fr" },
          gap: 1,
          mt: 1,
        }}
      >
        {sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            isFavorite={isFavorite(session.id)}
            onToggleFavorite={onToggleFavorite}
            conflictsWithFavorite={conflictIds.has(session.id)}
          />
        ))}
      </Box>
    </Box>
  );
}
