import { describe, expect, it } from "vitest";
import { createTheme } from "@mui/material";
import { theme } from "./theme";

describe("theme conformance (KERNEL/DESIGN.md)", () => {
  it("uses light mode", () => {
    expect(theme.palette.mode).toBe("light");
  });

  it("does not override MUI default colors", () => {
    const defaults = createTheme();
    expect(theme.palette.primary.main).toBe(defaults.palette.primary.main);
    expect(theme.palette.secondary.main).toBe(defaults.palette.secondary.main);
    expect(theme.palette.background.default).toBe(
      defaults.palette.background.default,
    );
  });

  it("does not override the default font or typography sizes", () => {
    const defaults = createTheme();
    expect(theme.typography.fontFamily).toBe(defaults.typography.fontFamily);
    expect(theme.typography.h5?.fontSize).toBe(defaults.typography.h5?.fontSize);
    expect(theme.typography.button?.textTransform).toBe(
      defaults.typography.button?.textTransform,
    );
  });
});
