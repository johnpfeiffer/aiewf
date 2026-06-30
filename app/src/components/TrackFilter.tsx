import { useState } from "react";
import { Box, Button, Chip, Stack, Typography } from "@mui/material";

interface TrackFilterProps {
  options: string[];
  selected: string[];
  onToggle: (track: string) => void;
  onClear: () => void;
}

const PREVIEW_COUNT = 8;

export function TrackFilter({
  options,
  selected,
  onToggle,
  onClear,
}: TrackFilterProps) {
  const [expanded, setExpanded] = useState(false);
  if (options.length === 0) {
    return null;
  }
  const visible = expanded ? options : options.slice(0, PREVIEW_COUNT);
  const hiddenCount = options.length - PREVIEW_COUNT;

  return (
    <Stack direction="column" gap={0.5}>
      <Stack direction="row" gap={0.5} flexWrap="wrap" alignItems="center">
        <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
          Track
        </Typography>
        <Box>
          {visible.map((track) => (
            <Chip
              key={track}
              size="small"
              label={track}
              color={selected.includes(track) ? "primary" : "default"}
              variant={selected.includes(track) ? "filled" : "outlined"}
              onClick={() => onToggle(track)}
              sx={{ mr: 0.5, mb: 0.5, maxWidth: 320 }}
            />
          ))}
          {hiddenCount > 0 && (
            <Button
              size="small"
              onClick={() => setExpanded((value) => !value)}
              sx={{ textTransform: "none" }}
            >
              {expanded ? "Show fewer" : `+${hiddenCount} more`}
            </Button>
          )}
        </Box>
      </Stack>
      {selected.length > 0 && (
        <Box>
          <Button
            size="small"
            onClick={onClear}
            sx={{ textTransform: "none", color: "text.secondary" }}
          >
            Clear tracks
          </Button>
        </Box>
      )}
    </Stack>
  );
}
