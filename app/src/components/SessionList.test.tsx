import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScheduleSession, groupByTimeSlot } from "../models/session";
import { SessionList } from "./SessionList";

function makeSession(id: string, startMin: number, start: string): ScheduleSession {
  return {
    id,
    day: "Day 2 — Session Day 1",
    type: "SESSION",
    track: "Software Factories · Main Stage",
    start,
    end: "9:30am",
    startMin,
    endMin: startMin + 30,
    tentative: false,
    title: `Session ${id}`,
    speakers: [{ name: "Jane Doe", role: "CEO, Acme", bio: "" }],
    description: "A deep dive into shipping agents that work.",
  };
}

const baseProps = {
  selectedId: null,
  onSelect: vi.fn(),
  isFavorite: vi.fn(),
  onToggleFavorite: vi.fn(),
  conflictIds: new Set<string>(),
  emptyMessage: "No matches.",
};

describe("SessionList session count", () => {
  it("shows 'N of M sessions' before Collapse all and updates with the visible set", () => {
    const two = groupByTimeSlot([
      makeSession("a", 540, "9:00am"),
      makeSession("b", 600, "10:00am"),
    ]);
    const { rerender } = render(
      <SessionList {...baseProps} timeSlots={two} showCount totalCount={10} />,
    );
    expect(screen.getByText((c) => c === "2 of 10 sessions")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Collapse all/i })).toBeInTheDocument();

    const one = groupByTimeSlot([makeSession("a", 540, "9:00am")]);
    rerender(<SessionList {...baseProps} timeSlots={one} showCount totalCount={10} />);
    expect(screen.getByText((c) => c === "1 of 10 sessions")).toBeInTheDocument();
  });

  it("renders a clear-filters link that fires onClearFilters when a filter is active", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(
      <SessionList
        {...baseProps}
        timeSlots={groupByTimeSlot([makeSession("a", 540, "9:00am")])}
        showCount
        totalCount={10}
        hasActiveFilters
        onClearFilters={onClear}
      />,
    );
    await user.click(screen.getByRole("button", { name: /clear filters/i }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("hides the count in My Schedule (showCount defaults off)", () => {
    render(
      <SessionList
        {...baseProps}
        timeSlots={groupByTimeSlot([makeSession("a", 540, "9:00am")])}
      />,
    );
    expect(screen.queryByText((c) => /of \d+ sessions/.test(c))).toBeNull();
    expect(screen.getByRole("button", { name: /Collapse all/i })).toBeInTheDocument();
  });

  it("still shows the count and a clear-filters link when filters match nothing", () => {
    const onClear = vi.fn();
    render(
      <SessionList
        {...baseProps}
        timeSlots={[]}
        showCount
        totalCount={10}
        hasActiveFilters
        onClearFilters={onClear}
      />,
    );
    expect(screen.getByText(/^0 of 10 sessions/, { selector: "span, p" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /clear filters/i })).toBeInTheDocument();
    expect(screen.getByText("No matches.")).toBeInTheDocument();
  });
});
