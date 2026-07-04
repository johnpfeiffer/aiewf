import { describe, expect, it } from "vitest";
import html from "../index.html?raw";

function metaContent(document: Document, selector: string): string | null {
  return document.querySelector<HTMLMetaElement>(selector)?.content ?? null;
}

describe("social metadata", () => {
  it("declares share-card metadata for feneky.com/aiewf", () => {
    const document = new DOMParser().parseFromString(html, "text/html");

    expect(
      metaContent(document, 'meta[property="og:url"]'),
    ).toBe("https://feneky.com/aiewf");
    expect(
      metaContent(document, 'meta[property="og:description"]'),
    ).toContain("Browse the AI Engineer World's Fair 2026 schedule");
    expect(
      metaContent(document, 'meta[property="og:image"]'),
    ).toBe("https://feneky.com/aiewf/og-image.png");
    expect(
      metaContent(document, 'meta[name="twitter:card"]'),
    ).toBe("summary_large_image");
  });
});
