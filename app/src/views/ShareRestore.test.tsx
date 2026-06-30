import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { FAVORITES_STORAGE_KEY } from "../models/favorites";
import { scheduleSessions } from "../models/scheduleData";
import { encodeFavorites } from "../models/shareUrl";

const ORIG_HREF = window.location.href;

describe("share-URL restore", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, "", ORIG_HREF);
  });

  it("restores My Schedule from ?s= on first load when empty", async () => {
    const user = userEvent.setup();
    const ids = scheduleSessions.slice(0, 3).map((s) => s.id);
    window.history.replaceState({}, "", `/?s=${encodeFavorites(ids, scheduleSessions)}`);

    render(<App />);
    await user.click(screen.getByRole("tab", { name: /My Schedule/i }));

    expect(screen.getByText(/3 saved sessions/i)).toBeInTheDocument();
    expect(
      screen.getAllByLabelText("Remove from My Schedule").length,
    ).toBeGreaterThanOrEqual(3);
  });

  it("does not restore when the user already has saved sessions", async () => {
    const user = userEvent.setup();
    const existing = scheduleSessions.slice(0, 2).map((s) => s.id);
    window.localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify(existing),
    );
    const shared = scheduleSessions.slice(5, 8).map((s) => s.id);
    window.history.replaceState({}, "", `/?s=${encodeFavorites(shared, scheduleSessions)}`);

    render(<App />);
    await user.click(screen.getByRole("tab", { name: /My Schedule/i }));

    // existing set is kept; the shared set in the URL is ignored
    expect(screen.getByText(/2 saved sessions/i)).toBeInTheDocument();
  });
});
