import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScheduleSession } from "../models/session";
import { SessionListItem } from "./SessionListItem";

function makeSession(overrides: Partial<ScheduleSession> = {}): ScheduleSession {
  return {
    id: "d2-001",
    day: "Day 2 — Session Day 1",
    type: "SESSION",
    track: "Software Factories · Main Stage",
    start: "9:00am",
    end: "9:30am",
    startMin: 540,
    endMin: 570,
    tentative: false,
    title: "Building Reliable Agents",
    speakers: [{ name: "Jane Doe", role: "CEO, Acme", bio: "" }],
    description: "A deep dive into shipping agents that work.",
    ...overrides,
  };
}

describe("SessionListItem", () => {
  it("renders title, time range, and track", () => {
    render(
      <SessionListItem
        session={makeSession()}
        selected={false}
        isFavorite={false}
        onSelect={vi.fn()}
        onToggleFavorite={vi.fn()}
      />,
    );
    expect(screen.getByText("Building Reliable Agents")).toBeInTheDocument();
    expect(screen.getByText(/9:00am–9:30am/)).toBeInTheDocument();
    expect(screen.getByText("Software Factories · Main Stage")).toBeInTheDocument();
  });

  it("calls onSelect with the session id when clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <SessionListItem
        session={makeSession()}
        selected={false}
        isFavorite={false}
        onSelect={onSelect}
        onToggleFavorite={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Building Reliable Agents/i }));
    expect(onSelect).toHaveBeenCalledWith("d2-001");
  });

  it("calls onToggleFavorite without selecting when the star is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onToggle = vi.fn();
    render(
      <SessionListItem
        session={makeSession()}
        selected={false}
        isFavorite={false}
        onSelect={onSelect}
        onToggleFavorite={onToggle}
      />,
    );
    await user.click(screen.getByLabelText("Add to My Schedule"));
    expect(onToggle).toHaveBeenCalledWith("d2-001");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("shows tentative and conflict chips when present", () => {
    render(
      <SessionListItem
        session={makeSession({ tentative: true })}
        selected={false}
        isFavorite={false}
        onSelect={vi.fn()}
        onToggleFavorite={vi.fn()}
        conflictsWithFavorite
      />,
    );
    expect(screen.getByText("tentative")).toBeInTheDocument();
    expect(screen.getByText("conflict")).toBeInTheDocument();
  });
});
