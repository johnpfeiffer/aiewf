import { Box, Chip, Stack, Typography } from "@mui/material";
import { SessionType, TYPE_LABEL } from "../models/session";

interface TypeFilterProps {
  options: SessionType[];
  selected: SessionType[];
  onToggle: (type: SessionType) => void;
}

export function TypeFilter({ options, selected, onToggle }: TypeFilterProps) {
  if (options.length <= 1) {
    return null;
  }
  return (
    <Stack direction="row" gap={0.5} flexWrap="wrap" alignItems="center">
      <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
        Type
      </Typography>
      <Box>
        {options.map((type) => (
          <Chip
            key={type}
            size="small"
            label={TYPE_LABEL[type]}
            color={selected.includes(type) ? "primary" : "default"}
            variant={selected.includes(type) ? "filled" : "outlined"}
            onClick={() => onToggle(type)}
            sx={{ mr: 0.5, mb: 0.5 }}
          />
        ))}
      </Box>
    </Stack>
  );
}
