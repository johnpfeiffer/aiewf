import { Box, Typography } from "@mui/material";
import { TimeSlot } from "../models/session";
import { TimeGroup } from "./TimeGroup";

interface SessionListProps {
  timeSlots: TimeSlot[];
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  conflictIds: Set<string>;
  emptyMessage: string;
}

export function SessionList({
  timeSlots,
  isFavorite,
  onToggleFavorite,
  conflictIds,
  emptyMessage,
}: SessionListProps) {
  if (timeSlots.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: "center" }}>
        <Typography color="text.secondary">{emptyMessage}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {timeSlots.map((slot) => (
        <TimeGroup
          key={slot.startMin}
          startLabel={slot.startLabel}
          sessions={slot.sessions}
          isFavorite={isFavorite}
          onToggleFavorite={onToggleFavorite}
          conflictIds={conflictIds}
        />
      ))}
    </Box>
  );
}
