import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScheduleSession } from "../models/session";
import { SessionDetail } from "./SessionDetail";

function makeSession(overrides: Partial<ScheduleSession> = {}): ScheduleSession {
  return {
    id: "d2-001",
    type: "KEYNOTE",
    track: "Software Factories · Main Stage",
    start: "9:00am",
    end: "9:05am",
    startMin: 540,
    endMin: 545,
    tentative: false,
    title: "Three Years of AI Engineering",
    speakers: [{ name: "swyx", role: "Curator, Latent Space / AI Engineer" }],
    description: "We celebrate the third birthday of the AI Engineer post.",
    ...overrides,
  };
}

describe("SessionDetail", () => {
  it("renders full details: title, track, speakers, description", () => {
    render(
      <SessionDetail
        session={makeSession()}
        isFavorite={false}
        onToggleFavorite={vi.fn()}
      />,
    );
    expect(screen.getByText("Three Years of AI Engineering")).toBeInTheDocument();
    expect(screen.getByText("Software Factories · Main Stage")).toBeInTheDocument();
    expect(screen.getByText(/swyx/)).toBeInTheDocument();
    expect(
      screen.getByText(/third birthday of the AI Engineer post/i),
    ).toBeInTheDocument();
  });

  it("shows an empty state when no session is selected", () => {
    render(
      <SessionDetail session={undefined} isFavorite={false} onToggleFavorite={vi.fn()} />,
    );
    expect(screen.getByText(/Select a session to see details/i)).toBeInTheDocument();
  });

  it("toggles favorites via the star control", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <SessionDetail
        session={makeSession()}
        isFavorite={false}
        onToggleFavorite={onToggle}
      />,
    );
    await user.click(screen.getByLabelText("Add to My Schedule"));
    expect(onToggle).toHaveBeenCalledWith("d2-001");
  });

  it("renders a conflict chip when conflictsWithFavorite is true", () => {
    render(
      <SessionDetail
        session={makeSession()}
        isFavorite
        onToggleFavorite={vi.fn()}
        conflictsWithFavorite
      />,
    );
    expect(screen.getByText("conflict")).toBeInTheDocument();
  });
});
