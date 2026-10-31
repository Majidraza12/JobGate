// HTML to plain text for job descriptions. ATS APIs return HTML fragments;
// generic career pages return whole documents and go through Readability first.
// Block structure is kept as line breaks and list items as "- " lines, because
// headings like "Preferred Qualifications:" are what separate required from
// preferred for the extractor.

import { createHash } from "node:crypto";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

// One shared window for fragments. jsdom does not run scripts by default, and
// <template> content is inert anyway.
const { document } = new JSDOM("").window;

const BLOCK = new Set([
  "ADDRESS", "ARTICLE", "ASIDE", "BLOCKQUOTE", "DD", "DIV", "DL", "DT", "FIELDSET", "FIGCAPTION",
  "FIGURE", "FOOTER", "FORM", "H1", "H2", "H3", "H4", "H5", "H6", "HEADER", "HR", "LI", "MAIN",
  "NAV", "OL", "P", "PRE", "SECTION", "TABLE", "TR", "UL",
]);
const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "SVG", "IFRAME"]);

// Shorter than this after cleaning means the page had no real description,
// typically a JavaScript-only shell.
export const MIN_JD_CHARS = 200;

function walk(node: Node, out: string[], pre = false) {
  for (const child of node.childNodes) {
    if (child.nodeType === 3) {
      // A newline in HTML source is just whitespace; only <br> and block
      // elements break lines (except inside <pre>).
      const t = child.textContent ?? "";
      out.push(pre ? t : t.replace(/[ \t\n\r\f]+/g, " "));
      continue;
    }
    if (child.nodeType !== 1) continue;
    const tag = (child as Element).tagName;
    if (SKIP.has(tag)) continue;
    if (tag === "BR") {
      out.push("\n");
      continue;
    }
    const block = BLOCK.has(tag);
    if (block) out.push("\n");
    if (tag === "LI") out.push("- ");
    walk(child, out, pre || tag === "PRE");
    if (block) out.push("\n");
    else if (tag === "TD" || tag === "TH") out.push(" ");
  }
}

export function cleanText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[   ]/g, " ")
    // Zero-width characters are invisible, so the model never copies them into
    // a quote, and the exact-substring check would then fail.
    .replace(/[​-‍⁠﻿]/g, "")
    .split("\n")
    .map((line) => line.replace(/[ \t\f\v]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    // <li><p>text</p></li> leaves the bullet on its own line; rejoin it.
    .replace(/^-\n+(?=[^\n])/gm, "- ")
    .trim();
}

export function htmlToText(html: string): string {
  const t = document.createElement("template");
  t.innerHTML = html;
  const out: string[] = [];
  walk(t.content, out);
  return cleanText(out.join(""));
}

// Greenhouse returns its HTML entity-escaped ("&lt;p&gt;..."), so decode once
// before parsing.
export function decodeEntities(s: string): string {
  const t = document.createElement("textarea");
  t.innerHTML = s;
  return t.value;
}

// Whole page: let Readability find the main content, then flatten it the same
// way as a fragment. Returns "" when Readability finds nothing.
export function pageToText(html: string, url: string): string {
  const dom = new JSDOM(html, { url });
  const article = new Readability(dom.window.document).parse();
  dom.window.close();
  return article?.content ? htmlToText(article.content) : "";
}

export function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}
