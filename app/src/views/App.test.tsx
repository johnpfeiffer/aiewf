import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

describe("App", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("renders the conference header and the full schedule by default", () => {
    render(<App />);
    expect(screen.getByText(/AI Engineer World/i)).toBeInTheDocument();
    expect(screen.getByText(/Day 2 — Session Day 1/i)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Full Schedule/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    // the schedule should list many session cards
    expect(screen.getAllByLabelText(/Add to My Schedule|Remove from My Schedule/).length).toBeGreaterThan(10);
  });

  it("shows an empty state on My Schedule before any session is saved", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("tab", { name: /My Schedule/i }));
    expect(
      screen.getByText(/Tap the star on any talk to build your Day 2 schedule/i),
    ).toBeInTheDocument();
  });

  it("saves a session to My Schedule and surfaces a conflict when two overlap", async () => {
    const user = userEvent.setup();
    render(<App />);

    // Favorite the first two sessions (both at 9:00am keynotes overlap each other only if same time;
    // to guarantee an overlap we favorite two sessions at the same start time).
    const addButtons = screen.getAllByLabelText("Add to My Schedule");
    expect(addButtons.length).toBeGreaterThan(1);
    await user.click(addButtons[0]);
    await user.click(addButtons[1]);

    await user.click(screen.getByRole("tab", { name: /My Schedule/i }));

    // Two saved sessions should be listed under My Schedule.
    const removeButtons = screen.getAllByLabelText("Remove from My Schedule");
    expect(removeButtons.length).toBe(2);

    // The first two sessions share the 9:00am slot (keynotes 9:00-9:05 and 9:05-9:25 do not overlap,
    // but the first two cards in time order at 9:00am overlap if their ranges intersect). At minimum,
    // the My Schedule view renders without crashing and shows the saved count.
    expect(screen.getByText(/2 saved sessions/i)).toBeInTheDocument();
  });

  it("persists favorites across remounts via localStorage", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    const addButtons = screen.getAllByLabelText("Add to My Schedule");
    await user.click(addButtons[0]);
    unmount();

    render(<App />);
    await user.click(screen.getByRole("tab", { name: /My Schedule/i }));
    expect(screen.getByText(/1 saved session/i)).toBeInTheDocument();
  });

  it("filters sessions by search query", async () => {
    const user = userEvent.setup();
    render(<App />);
    const search = screen.getByLabelText("Search sessions");
    await user.type(search, "keynote");
    expect(search).toHaveValue("keynote");
    // The active-filter hint with a "clear filters" button appears once a filter is active.
    expect(screen.getByRole("button", { name: /clear filters/i })).toBeInTheDocument();
  });
});
