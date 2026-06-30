import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Loopcraft from "./Loopcraft";

describe("Loopcraft", () => {
  it("shows the title slide first", () => {
    render(<Loopcraft />);
    expect(screen.getByText("The Highest Loop")).toBeInTheDocument();
    expect(screen.getByText("swyx")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /begin/i })).toBeInTheDocument();
    // the section nav is hidden on the intro slide
    expect(screen.queryByText("Nested loops")).not.toBeInTheDocument();
  });

  it("begins the deck via the begin link", async () => {
    const user = userEvent.setup();
    render(<Loopcraft />);
    await user.click(screen.getByRole("link", { name: /begin/i }));
    expect(
      screen.getByText(/Loopcraft: The Art of Stacking Loops/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/token loop/i)).toBeInTheDocument();
    expect(screen.getByText("the")).toBeInTheDocument();
    expect(screen.getByText(/Level 1 \/ 6/)).toBeInTheDocument();
  });

  it("advances and retracts levels with the controls", async () => {
    const user = userEvent.setup();
    render(<Loopcraft />);
    await user.click(screen.getByRole("link", { name: /begin/i }));

    await user.click(screen.getByRole("button", { name: /Next/i }));
    expect(screen.getByText(/Level 2 \/ 6/)).toBeInTheDocument();
    expect(screen.getByText(/chat loop/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Back/i }));
    expect(screen.getByText(/Level 1 \/ 6/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Back/i })).toBeDisabled();
  });

  it("advances on ArrowRight (keyboard), matching the original stepper", async () => {
    const user = userEvent.setup();
    render(<Loopcraft />);
    await user.keyboard("{ArrowRight}");
    expect(
      screen.getByText(/Loopcraft: The Art of Stacking Loops/i),
    ).toBeInTheDocument();
  });

  it("switches sections via the nav", async () => {
    const user = userEvent.setup();
    render(<Loopcraft />);
    await user.click(screen.getByRole("link", { name: /begin/i }));

    await user.click(screen.getByText("While-loop ladder"));
    expect(screen.getByText(/predict the next token/i)).toBeInTheDocument();
    expect(screen.getAllByText(/while/i).length).toBeGreaterThan(0);

    await user.click(screen.getByText("Human life"));
    expect(screen.getByText(/heartbeats/i)).toBeInTheDocument();
  });

  it("renders the summit arc (? -> Summits) and the conference cards", async () => {
    const user = userEvent.setup();
    render(<Loopcraft />);
    await user.click(screen.getByRole("link", { name: /begin/i }));
    await user.click(screen.getByText("The highest loop"));

    expect(
      screen.getByText(/every loop is the body of a bigger loop/i),
    ).toBeInTheDocument();
    expect(screen.getByText((c) => c === "?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Next/i }));
    expect(screen.getByText("Summits")).toBeInTheDocument();
    expect(screen.getByText(/the AI Engineer Summit/i)).toBeInTheDocument();
  });

  it("renders the stress-curve frame and caption", async () => {
    const user = userEvent.setup();
    render(<Loopcraft />);
    await user.click(screen.getByRole("link", { name: /begin/i }));
    await user.click(screen.getByText("Stress curves"));

    expect(screen.getByRole("img", { name: /step 1/i })).toBeInTheDocument();
    expect(screen.getByText(/2023 — the index begins/i)).toBeInTheDocument();
  });

  it("reaches the last nested level and disables Next", async () => {
    const user = userEvent.setup();
    render(<Loopcraft />);
    await user.click(screen.getByRole("link", { name: /begin/i }));
    for (let i = 0; i < 5; i++) {
      await user.click(screen.getByRole("button", { name: /Next/i }));
    }
    expect(screen.getByText(/Level 6 \/ 6/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Next/i })).toBeDisabled();
  });
});
