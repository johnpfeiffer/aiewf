import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import App from "./views/App";
import "./styles.css";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#2d4ba8",
    },
    secondary: {
      main: "#c2410c",
    },
    background: {
      default: "#f5f6fa",
      paper: "#ffffff",
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: {
      fontSize: "1.6rem",
      fontWeight: 700,
      letterSpacing: 0,
    },
    h2: {
      fontSize: "1.05rem",
      fontWeight: 700,
      letterSpacing: 0,
    },
    h3: {
      fontSize: "0.95rem",
      fontWeight: 700,
      letterSpacing: 0,
    },
    button: {
      letterSpacing: 0,
      textTransform: "none",
    },
  },
});

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
);
