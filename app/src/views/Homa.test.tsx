import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Homa from "./Homa";

describe("Homa view", () => {
  it("renders the scene tabs with TCP vs Homa active by default", () => {
    render(<Homa />);
    expect(screen.getByRole("tab", { name: /TCP vs Homa/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText(/Same workload, two transports/i)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Homa rail-yard/i })).toBeInTheDocument();
  });

  it("switches to Blind send + grant and shows the 'why not schedule' overlay", async () => {
    const user = userEvent.setup();
    render(<Homa />);
    await user.click(screen.getByRole("tab", { name: /Blind send/i }));
    expect(screen.getByRole("tab", { name: /Blind send/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText(/Why not schedule everything?/i)).toBeInTheDocument();
  });

  it("renders a stub for scenes beyond the MVP", async () => {
    const user = userEvent.setup();
    render(<Homa />);
    await user.click(screen.getByRole("tab", { name: /Preemption lag/i }));
    expect(screen.getByText(/Planned · not in v1/i)).toBeInTheDocument();
  });

  it("advances the deterministic clock one tick via Step", async () => {
    const user = userEvent.setup();
    render(<Homa />);
    await user.click(screen.getByRole("tab", { name: /Blind send/i }));
    expect(screen.getByText(/t = 0ms/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Step/i }));
    expect(screen.getByText(/t = 1ms/i)).toBeInTheDocument();
  });

  it("exposes the live event log ('why this moved now')", async () => {
    const user = userEvent.setup();
    render(<Homa />);
    await user.click(screen.getByRole("tab", { name: /Blind send/i }));
    await user.click(screen.getByRole("button", { name: /Step/i }));
    // after one step a new RPC is spawned and its unscheduled data is sent
    expect(screen.getByText(/new RPC/i)).toBeInTheDocument();
    expect(screen.getByText(/blind send:.*unscheduled from s0/i)).toBeInTheDocument();
  });
});
