import { useState } from "react";
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
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Box>
      <Typography
        variant="subtitle2"
        component="h2"
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        aria-label={`${startLabel} — ${sessions.length} ${sessions.length === 1 ? "session" : "sessions"} — ${collapsed ? "expand" : "collapse"}`}
        onClick={() => setCollapsed((c) => !c)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setCollapsed((c) => !c);
          }
        }}
        sx={{
          position: "sticky",
          top: 0,
          bgcolor: "background.default",
          borderBottom: "1px solid",
          borderColor: "divider",
          py: 0.5,
          zIndex: 1,
          cursor: "pointer",
          userSelect: "none",
          "&:hover": { bgcolor: "action.hover" },
        }}
      >
        <Box component="span" sx={{ display: "inline-block", width: "1em" }}>
          {collapsed ? "▸" : "▾"}
        </Box>
        {startLabel}
        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
          {sessions.length} {sessions.length === 1 ? "session" : "sessions"}
        </Typography>
      </Typography>
      {!collapsed && (
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
      )}
    </Box>
  );
}
