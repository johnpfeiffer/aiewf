import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScheduleSession } from "../models/session";
import { SessionCard } from "./SessionCard";

function makeSession(overrides: Partial<ScheduleSession> = {}): ScheduleSession {
  return {
    id: "d2-001",
    type: "SESSION",
    track: "Software Factories · Main Stage",
    start: "9:00am",
    end: "9:30am",
    startMin: 540,
    endMin: 570,
    tentative: false,
    title: "Building Reliable Agents",
    speakers: [{ name: "Jane Doe", role: "CEO, Acme" }],
    description: "A deep dive into shipping agents that work.",
    ...overrides,
  };
}

describe("SessionCard", () => {
  it("renders title, time range, track, and speaker", () => {
    render(
      <SessionCard
        session={makeSession()}
        isFavorite={false}
        onToggleFavorite={vi.fn()}
      />,
    );
    expect(screen.getByText("Building Reliable Agents")).toBeInTheDocument();
    expect(screen.getByText(/9:00am–9:30am/)).toBeInTheDocument();
    expect(screen.getByText("Software Factories · Main Stage")).toBeInTheDocument();
    expect(screen.getByText(/Jane Doe/)).toBeInTheDocument();
  });

  it("calls onToggleFavorite with the session id when the star is clicked", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <SessionCard
        session={makeSession()}
        isFavorite={false}
        onToggleFavorite={onToggle}
      />,
    );
    await user.click(screen.getByLabelText("Add to My Schedule"));
    expect(onToggle).toHaveBeenCalledWith("d2-001");
  });

  it("shows a tentative chip for tentative sessions", () => {
    render(
      <SessionCard
        session={makeSession({ tentative: true })}
        isFavorite={false}
        onToggleFavorite={vi.fn()}
      />,
    );
    expect(screen.getByText("tentative")).toBeInTheDocument();
  });

  it("shows a conflict chip when conflictsWithFavorite is true", () => {
    render(
      <SessionCard
        session={makeSession()}
        isFavorite
        onToggleFavorite={vi.fn()}
        conflictsWithFavorite
      />,
    );
    expect(screen.getByText("conflict")).toBeInTheDocument();
  });
});
