import { describe, expect, it } from "vitest";
import { linkify } from "./linkify";

describe("linkify", () => {
  it("returns a single text part when there is no URL", () => {
    expect(linkify("No links here.")).toEqual([
      { type: "text", value: "No links here." },
    ]);
  });

  it("extracts a URL and keeps surrounding text", () => {
    expect(linkify("Read the post https://www.latent.space/p/ai-engineer for details")).toEqual([
      { type: "text", value: "Read the post " },
      {
        type: "link",
        value: "https://www.latent.space/p/ai-engineer",
        href: "https://www.latent.space/p/ai-engineer",
      },
      { type: "text", value: " for details" },
    ]);
  });

  it("keeps trailing sentence punctuation out of the link", () => {
    expect(linkify("See https://www.latent.space/p/ai-engineer.")).toEqual([
      { type: "text", value: "See " },
      {
        type: "link",
        value: "https://www.latent.space/p/ai-engineer",
        href: "https://www.latent.space/p/ai-engineer",
      },
      { type: "text", value: "." },
    ]);
  });
});
