import { createTheme } from "@mui/material";

// Per KERNEL/DESIGN.md: "Use MUI defaults, only specify overrides."
// Light mode is the MUI default; declared explicitly to satisfy the spec.
// No custom colors, fonts, or typography sizes.
export const theme = createTheme({
  palette: {
    mode: "light",
  },
});
