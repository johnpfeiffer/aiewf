import { Chip, IconButton, Paper, Stack, Typography } from "@mui/material";
import {
  ScheduleSession,
  TYPE_LABEL,
  durationLabel,
  formatTimeRange,
} from "../models/session";

interface SessionListItemProps {
  session: ScheduleSession;
  selected: boolean;
  isFavorite: boolean;
  onSelect: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  conflictsWithFavorite?: boolean;
}

export function SessionListItem({
  session,
  selected,
  isFavorite,
  onSelect,
  onToggleFavorite,
  conflictsWithFavorite,
}: SessionListItemProps) {
  return (
    <Paper
      variant="outlined"
      role="button"
      tabIndex={0}
      aria-selected={selected}
      aria-label={session.title}
      onClick={() => onSelect(session.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(session.id);
        }
      }}
      sx={{
        p: 1,
        mb: 0.5,
        cursor: "pointer",
        borderColor: selected ? "primary.main" : "divider",
        bgcolor: selected ? "action.selected" : "background.paper",
      }}
    >
      <Stack direction="row" justifyContent="space-between" gap={1} alignItems="flex-start">
        <Stack sx={{ minWidth: 0, flex: 1 }} spacing={0.25}>
          <Stack direction="row" gap={0.5} flexWrap="wrap" alignItems="center">
            <Chip
              size="small"
              label={TYPE_LABEL[session.type]}
              color={selected ? "primary" : "default"}
              variant={selected ? "filled" : "outlined"}
            />
            <Typography variant="caption" color="text.secondary">
              {formatTimeRange(session)} · {durationLabel(session)}
            </Typography>
            {session.tentative && (
              <Chip size="small" label="tentative" variant="outlined" color="warning" />
            )}
            {conflictsWithFavorite && (
              <Chip size="small" label="conflict" color="error" />
            )}
          </Stack>
          <Typography variant="body2" component="div" noWrap>
            {session.title}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {session.track}
          </Typography>
        </Stack>
        <IconButton
          aria-label={isFavorite ? "Remove from My Schedule" : "Add to My Schedule"}
          onClick={(event) => {
            event.stopPropagation();
            onToggleFavorite(session.id);
          }}
          size="small"
          sx={{ color: isFavorite ? "warning.main" : "text.disabled" }}
        >
          <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>{isFavorite ? "★" : "☆"}</span>
        </IconButton>
      </Stack>
    </Paper>
  );
}
