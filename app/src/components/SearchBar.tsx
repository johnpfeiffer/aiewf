import { TextField } from "@mui/material";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <TextField
      fullWidth
      size="small"
      placeholder="Search talks, speakers, tracks, or descriptions…"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      slotProps={{ htmlInput: { "aria-label": "Search sessions" } }}
    />
  );
}
