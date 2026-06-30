import { Box, Typography } from "@mui/material";
import { ScheduleSession } from "../models/session";
import { SessionListItem } from "./SessionListItem";

interface TimeGroupProps {
  startLabel: string;
  sessions: ScheduleSession[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  conflictIds: Set<string>;
}

export function TimeGroup({
  startLabel,
  sessions,
  selectedId,
  onSelect,
  isFavorite,
  onToggleFavorite,
  conflictIds,
}: TimeGroupProps) {
  return (
    <Box>
      <Typography
        variant="subtitle2"
        component="h2"
        sx={{
          position: "sticky",
          top: 0,
          bgcolor: "background.default",
          borderBottom: "1px solid",
          borderColor: "divider",
          py: 0.5,
          zIndex: 1,
        }}
      >
        {startLabel}
        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
          {sessions.length} {sessions.length === 1 ? "session" : "sessions"}
        </Typography>
      </Typography>
      <Box sx={{ mt: 1 }}>
        {sessions.map((session) => (
          <SessionListItem
            key={session.id}
            session={session}
            selected={session.id === selectedId}
            isFavorite={isFavorite(session.id)}
            onSelect={onSelect}
            onToggleFavorite={onToggleFavorite}
            conflictsWithFavorite={conflictIds.has(session.id)}
          />
        ))}
      </Box>
    </Box>
  );
}
