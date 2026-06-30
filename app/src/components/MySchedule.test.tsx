import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { scheduleSessions } from "../models/scheduleData";
import {
  SHARE_PARAM,
  copyShareUrl,
  decodeFavorites,
} from "../models/shareUrl";
import { MySchedule } from "./MySchedule";

// Keep the real encode/decode/build helpers, but swap out clipboard access.
vi.mock("../models/shareUrl", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../models/shareUrl")>();
  return { ...actual, copyShareUrl: vi.fn().mockResolvedValue(true) };
});

function renderWithFavorites(ids: string[]) {
  return render(
    <MySchedule
      allSessions={scheduleSessions}
      favoriteIds={ids}
      isFavorite={(id) => ids.includes(id)}
      onToggleFavorite={vi.fn()}
      onClearFavorites={vi.fn()}
      selectedId={null}
      onSelect={vi.fn()}
    />,
  );
}

describe("MySchedule share button", () => {
  afterEach(() => {
    vi.mocked(copyShareUrl).mockClear();
  });

  it("builds and copies a shareable URL carrying the saved session IDs", async () => {
    const user = userEvent.setup();
    const ids = scheduleSessions.slice(0, 2).map((s) => s.id);
    renderWithFavorites(ids);

    await user.click(screen.getByRole("button", { name: /Share my schedule/i }));

    expect(copyShareUrl).toHaveBeenCalledTimes(1);
    const url = vi.mocked(copyShareUrl).mock.calls[0][0];
    expect(url).toContain(`${SHARE_PARAM}=`);
    const code = new URL(url).searchParams.get(SHARE_PARAM);
    expect(decodeFavorites(code ?? "", scheduleSessions)).toEqual(ids);

    // the link is also revealed for manual copy, and the copy is confirmed
    expect(await screen.findByDisplayValue(url)).toBeInTheDocument();
    expect(await screen.findByText(/Link copied to clipboard/i)).toBeInTheDocument();
  });
});
