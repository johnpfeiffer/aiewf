import { useMemo } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import {
  ScheduleSession,
  conflictingIds,
  groupByTimeSlot,
  sortSessionsByTime,
} from "../models/session";
import { ConflictNotice } from "./ConflictNotice";
import { SessionList } from "./SessionList";

interface MyScheduleProps {
  allSessions: ScheduleSession[];
  favoriteIds: string[];
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  onClearFavorites: () => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function MySchedule({
  allSessions,
  favoriteIds,
  isFavorite,
  onToggleFavorite,
  onClearFavorites,
  selectedId,
  onSelect,
}: MyScheduleProps) {
  const byId = useMemo(
    () => new Map(allSessions.map((session) => [session.id, session])),
    [allSessions],
  );

  const favoriteSessions = useMemo(
    () =>
      sortSessionsByTime(
        favoriteIds
          .map((id) => byId.get(id))
          .filter((session): session is ScheduleSession => Boolean(session)),
      ),
    [byId, favoriteIds],
  );

  const conflictIds = useMemo(
    () => conflictingIds(favoriteSessions),
    [favoriteSessions],
  );

  const timeSlots = useMemo(
    () => groupByTimeSlot(favoriteSessions),
    [favoriteSessions],
  );

  if (favoriteSessions.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: "center" }}>
        <Typography color="text.secondary">
          No saved sessions yet. Tap the star on any talk to build your Day 2 schedule.
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography color="text.secondary">
          {favoriteSessions.length} saved session{favoriteSessions.length === 1 ? "" : "s"}
        </Typography>
        <Button
          size="small"
          color="error"
          variant="text"
          onClick={onClearFavorites}
        >
          Clear all
        </Button>
      </Stack>
      <ConflictNotice conflictCount={conflictIds.size} />
      <SessionList
        timeSlots={timeSlots}
        selectedId={selectedId}
        onSelect={onSelect}
        isFavorite={isFavorite}
        onToggleFavorite={onToggleFavorite}
        conflictIds={conflictIds}
        emptyMessage="No saved sessions match."
      />
    </Stack>
  );
}
