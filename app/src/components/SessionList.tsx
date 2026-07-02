import { useCallback, useState } from "react";
import { Box, Button, Link, Stack, Typography } from "@mui/material";
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
  /** Show the "N of M sessions" count and clear-filters link (day schedule only;
   *  hidden in My Schedule, which reuses this component). */
  showCount?: boolean;
  totalCount?: number;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}

export function SessionList({
  timeSlots,
  selectedId,
  onSelect,
  isFavorite,
  onToggleFavorite,
  conflictIds,
  emptyMessage,
  showCount = false,
  totalCount = 0,
  hasActiveFilters = false,
  onClearFilters,
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

  const visibleCount = timeSlots.reduce((n, s) => n + s.sessions.length, 0);
  const isEmpty = timeSlots.length === 0;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        {showCount && (
          <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
            {visibleCount} of {totalCount} session{totalCount === 1 ? "" : "s"}
            {hasActiveFilters && (
              <>
                {" · "}
                <Link component="button" type="button" onClick={onClearFilters}>
                  clear filters
                </Link>
              </>
            )}
          </Typography>
        )}
        {!isEmpty && (
          <>
            <Button size="small" variant="text" onClick={collapseAll} sx={{ textTransform: "none" }}>
              Collapse all
            </Button>
            <Button size="small" variant="text" onClick={expandAll} sx={{ textTransform: "none" }}>
              Expand all
            </Button>
          </>
        )}
      </Stack>

      {isEmpty ? (
        <Box sx={{ py: 6, textAlign: "center" }}>
          <Typography color="text.secondary">{emptyMessage}</Typography>
        </Box>
      ) : (
        timeSlots.map((slot) => (
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
        ))
      )}
    </Box>
  );
}
