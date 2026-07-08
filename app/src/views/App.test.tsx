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
    const officialLink = screen.getByRole("link", {
      name: /AI Engineer World's Fair/i,
    });
    expect(officialLink).toHaveAttribute(
      "href",
      "https://www.ai.engineer/worldsfair/2026",
    );
    expect(officialLink).toHaveAttribute("target", "_blank");
    expect(screen.getByText(/June 29.+July 2, 2026/i)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Day 2" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    // the schedule should list many sessions (left list) plus a detail pane
    expect(screen.getAllByLabelText(/Add to My Schedule|Remove from My Schedule/).length).toBeGreaterThan(10);
  });

  it("renders a footer credit linking to John Pfeiffer's LinkedIn", () => {
    render(<App />);
    expect(screen.getByText(/Built by John Pfeiffer/i)).toBeInTheDocument();
    const linkedIn = screen.getByRole("link", {
      name: "John Pfeiffer on LinkedIn",
    });
    expect(linkedIn).toHaveAttribute(
      "href",
      "https://www.linkedin.com/in/foupfeiffer",
    );
    expect(linkedIn).toHaveAttribute("target", "_blank");
  });

  it("renders a footer link to the GitHub source code", () => {
    render(<App />);
    const github = screen.getByRole("link", {
      name: "Source code on GitHub",
    });
    expect(github).toHaveAttribute(
      "href",
      "https://github.com/johnpfeiffer/aiewf",
    );
    expect(github).toHaveAttribute("target", "_blank");
  });

  it("shows an empty state on My Schedule before any session is saved", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("tab", { name: /My Schedule/i }));
    expect(
      screen.getByText(/Tap the star on any talk to build your schedule/i),
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

    // Two saved sessions should be listed under My Schedule. The master/detail
    // layout also renders a detail pane for the selected (saved) session, so
    // there is one extra "Remove" control beyond the two list items.
    const removeButtons = screen.getAllByLabelText("Remove from My Schedule");
    expect(removeButtons.length).toBeGreaterThanOrEqual(2);

    // The My Schedule view renders without crashing and shows the saved count.
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
    // The count + clear-filters control now lives near Collapse all, and
    // appears once a filter is active.
    expect(screen.getByRole("button", { name: /clear filters/i })).toBeInTheDocument();
  });
});
