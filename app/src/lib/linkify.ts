// Splits free text into plain-text and URL parts so URLs can be rendered as
// clickable links. Trailing sentence punctuation (e.g. a period) is kept out of
// the URL so "see https://example.com/p/foo." links to the page, not the dot.

export type LinkifyPart =
  | { type: "text"; value: string }
  | { type: "link"; value: string; href: string };

const URL_PATTERN = /https?:\/\/[^\s]+/g;
const TRAILING_PUNCTUATION = /[.,!?;:)\]]+$/;

export function linkify(text: string): LinkifyPart[] {
  const parts: LinkifyPart[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const start = match.index ?? 0;
    let url = match[0];
    let trailing = "";

    const punctuation = url.match(TRAILING_PUNCTUATION);
    if (punctuation) {
      trailing = punctuation[0];
      url = url.slice(0, url.length - trailing.length);
    }

    if (start > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, start) });
    }
    parts.push({ type: "link", value: url, href: url });
    if (trailing) {
      parts.push({ type: "text", value: trailing });
    }
    lastIndex = start + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }

  return parts;
}
