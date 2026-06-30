import { useMemo, useState } from "react";
import { Box, Button, OutlinedInput, Stack, Typography } from "@mui/material";
import {
  ScheduleSession,
  conflictingIds,
  groupByTimeSlot,
  sortSessionsByTime,
} from "../models/session";
import { buildShareUrl, copyShareUrl } from "../models/shareUrl";
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

  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    const url = buildShareUrl(favoriteIds, allSessions);
    if (!url) return;
    setShareUrl(url);
    setCopied(false);
    copyShareUrl(url).then((ok) => setCopied(ok));
  };

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
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={1}
      >
        <Typography color="text.secondary">
          {favoriteSessions.length} saved session
          {favoriteSessions.length === 1 ? "" : "s"}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="outlined"
            onClick={handleShare}
            aria-label="Share my schedule"
          >
            Share
          </Button>
          <Button
            size="small"
            color="error"
            variant="text"
            onClick={onClearFavorites}
          >
            Clear all
          </Button>
        </Stack>
      </Stack>

      {shareUrl && (
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <OutlinedInput
            value={shareUrl}
            size="small"
            readOnly
            onChange={() => {}}
            onFocus={(event) => event.currentTarget.select()}
            slotProps={{ input: { "aria-label": "Shareable schedule link" } }}
            sx={{ flex: 1, minWidth: 220, fontSize: 13 }}
          />
          <Typography variant="caption" color={copied ? "success.main" : "text.secondary"}>
            {copied ? "Link copied to clipboard!" : "Copy this link to share your schedule"}
          </Typography>
        </Stack>
      )}

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
