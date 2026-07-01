import { useCallback, useState } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { TimeSlot } from "../models/session";
import { TimeGroup } from "./TimeGroup";

interface SessionListProps {
  timeSlots: TimeSlot[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  conflictIds: Set<string>;
  emptyMessage: string;
}

export function SessionList({
  timeSlots,
  selectedId,
  onSelect,
  isFavorite,
  onToggleFavorite,
  conflictIds,
  emptyMessage,
}: SessionListProps) {
  const [collapsedSlots, setCollapsedSlots] = useState<Set<number>>(new Set());

  const toggleSlot = useCallback((startMin: number) => {
    setCollapsedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(startMin)) {
        next.delete(startMin);
      } else {
        next.add(startMin);
      }
      return next;
    });
  }, []);

  const collapseAll = useCallback(() => {
    setCollapsedSlots(new Set(timeSlots.map((s) => s.startMin)));
  }, [timeSlots]);

  const expandAll = useCallback(() => {
    setCollapsedSlots(new Set());
  }, []);

  if (timeSlots.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: "center" }}>
        <Typography color="text.secondary">{emptyMessage}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Stack direction="row" spacing={1}>
        <Button size="small" variant="text" onClick={collapseAll} sx={{ textTransform: "none" }}>
          Collapse all
        </Button>
        <Button size="small" variant="text" onClick={expandAll} sx={{ textTransform: "none" }}>
          Expand all
        </Button>
      </Stack>
      {timeSlots.map((slot) => (
        <TimeGroup
          key={slot.startMin}
          startLabel={slot.startLabel}
          sessions={slot.sessions}
          selectedId={selectedId}
          onSelect={onSelect}
          isFavorite={isFavorite}
          onToggleFavorite={onToggleFavorite}
          conflictIds={conflictIds}
          collapsed={collapsedSlots.has(slot.startMin)}
          onToggleCollapse={() => toggleSlot(slot.startMin)}
        />
      ))}
    </Box>
  );
}
