import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScheduleSession, TranscriptData } from "../models/session";
import { SessionDetail } from "./SessionDetail";

function makeSession(overrides: Partial<ScheduleSession> = {}): ScheduleSession {
  return {
    id: "d2-001",
    day: "Day 2 — Session Day 1",
    type: "KEYNOTE",
    track: "Software Factories · Main Stage",
    start: "9:00am",
    end: "9:05am",
    startMin: 540,
    endMin: 545,
    tentative: false,
    title: "Three Years of AI Engineering",
    speakers: [{ name: "swyx", role: "Curator, Latent Space / AI Engineer", bio: "" }],
    description: "We celebrate the third birthday of the AI Engineer post.",
    videoUrl: undefined,
    ...overrides,
  };
}

const sampleTranscript: TranscriptData = {
  start: "00:01:08",
  end: "00:11:15",
  text: "Welcome to the World's Fair. Let's kick off the stage.",
};

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

  it("visually separates speaker bios from the session description", () => {
    render(
      <SessionDetail
        session={makeSession({
          speakers: [
            {
              name: "swyx",
              role: "Curator, Latent Space / AI Engineer",
              bio: "Writes about AI engineering systems.",
            },
          ],
        })}
        isFavorite={false}
        onToggleFavorite={vi.fn()}
      />,
    );
    expect(screen.getByRole("heading", { name: "Speakers" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Session Description" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Writes about AI engineering systems.")).toBeInTheDocument();
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

  it("renders URLs in the description as clickable links", () => {
    render(
      <SessionDetail
        session={makeSession({
          description:
            "We celebrate the third birthday of the AI Engineer post. https://www.latent.space/p/ai-engineer",
        })}
        isFavorite={false}
        onToggleFavorite={vi.fn()}
      />,
    );
    const link = screen.getByRole("link", {
      name: "https://www.latent.space/p/ai-engineer",
    });
    expect(link).toHaveAttribute("href", "https://www.latent.space/p/ai-engineer");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("renders an external video link when available", () => {
    render(
      <SessionDetail
        session={makeSession({
          videoUrl: "https://www.youtube.com/watch?v=htM02KMNZnk&t=12845s",
        })}
        isFavorite={false}
        onToggleFavorite={vi.fn()}
      />,
    );
    const link = screen.getByRole("link", { name: "Watch video" });
    expect(link).toHaveAttribute(
      "href",
      "https://www.youtube.com/watch?v=htM02KMNZnk&t=12845s",
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.closest("p")).toHaveTextContent(
      "Software Factories · Main Stage Watch video",
    );
  });

  it("shows a Transcript button when the session has a transcript", () => {
    render(
      <SessionDetail
        session={makeSession({ transcript: sampleTranscript })}
        isFavorite={false}
        onToggleFavorite={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Transcript" })).toBeInTheDocument();
  });

  it("does not show a Transcript button when the session has no transcript", () => {
    render(
      <SessionDetail
        session={makeSession()}
        isFavorite={false}
        onToggleFavorite={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: "Transcript" })).not.toBeInTheDocument();
  });

  it("opens the transcript panel when the Transcript button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <SessionDetail
        session={makeSession({ transcript: sampleTranscript })}
        isFavorite={false}
        onToggleFavorite={vi.fn()}
      />,
    );
    expect(screen.queryByText("Transcript", { selector: "h3" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Transcript" }));
    expect(screen.getByRole("heading", { name: "Transcript" })).toBeInTheDocument();
    expect(screen.getByText(sampleTranscript.text)).toBeInTheDocument();
  });

  it("hides the transcript panel when the button is clicked again", async () => {
    const user = userEvent.setup();
    render(
      <SessionDetail
        session={makeSession({ transcript: sampleTranscript })}
        isFavorite={false}
        onToggleFavorite={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Transcript" }));
    expect(screen.getByRole("heading", { name: "Transcript" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Hide transcript" }));
    expect(screen.queryByRole("heading", { name: "Transcript" })).not.toBeInTheDocument();
  });

  it("displays the start and end timestamps in the transcript panel", async () => {
    const user = userEvent.setup();
    render(
      <SessionDetail
        session={makeSession({ transcript: sampleTranscript })}
        isFavorite={false}
        onToggleFavorite={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Transcript" }));
    expect(screen.getByText("00:01:08 / 00:11:15")).toBeInTheDocument();
  });

  it("shows a Jump to video link when both transcript and videoUrl exist", async () => {
    const user = userEvent.setup();
    render(
      <SessionDetail
        session={makeSession({
          transcript: sampleTranscript,
          videoUrl: "https://www.youtube.com/watch?v=abc&t=68s",
        })}
        isFavorite={false}
        onToggleFavorite={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Transcript" }));
    expect(screen.getByRole("link", { name: "Jump to video" })).toBeInTheDocument();
  });
});
