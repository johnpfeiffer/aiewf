import { createTheme } from "@mui/material";

// Per KERNEL/DESIGN.md: "Use MUI defaults, only specify overrides."
// Light mode is the MUI default; declared explicitly to satisfy the spec.
// Keep MUI fonts/colors. Override only small text so UI copy stays >= 14px.
export const theme = createTheme({
  palette: {
    mode: "light",
  },
  typography: {
    caption: {
      fontSize: "0.875rem",
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        sizeSmall: {
          fontSize: "0.875rem",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        labelSmall: {
          fontSize: "0.875rem",
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        sizeSmall: {
          fontSize: "0.875rem",
        },
      },
    },
  },
});
