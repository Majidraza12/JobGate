// Finds the phrase that matters inside an evidence quote ("December 2026 -
// June 2027", "Junior or Senior year", "U.S. citizen") so the card can mark
// it. Display only: a miss just means no highlight, never a different verdict.
import type { GateField } from "@core/requirements";

const MONTH = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?";
const DATE = `(?:\\b${MONTH}(?:\\s*/\\s*${MONTH})?,?\\s+(?:19|20)\\d{2}\\b|\\b(?:spring|summer|fall|autumn|winter)\\s+(?:19|20)\\d{2}\\b|\\b(?:19|20)\\d{2}\\b)`;

const PATTERNS: Partial<Record<GateField, RegExp>> = {
  grad_requirements: new RegExp(DATE, "gi"),
  class_years: /\b(?:freshm[ae]n|sophomores?|juniors?|seniors?|rising [a-z]+|first[- ]year|second[- ]year|third[- ]year|undergraduates?)(?: years?)?\b/gi,
  degree_levels: /\b(?:bachelor'?s|master'?s|ph\.? ?d\.?|doctoral|doctorate|associate'?s)(?: degrees?)?|\b(?:B\.S\.|M\.S\.|BS|MS)\b/gi,
  must_return_to_school: /\breturn(?:ing)? to (?:school|university|college|campus|your studies)|\bcontinuing (?:[a-z]+ ){0,3}(?:student|enrollment)|\b(?:currently|remain|still) enrolled|\bat least one (?:more )?(?:semester|quarter|term)/gi,
  citizenship_required: /\b(?:U\.?\s?S\.?|United States|American) citizen(?:ship|s)?\b/gi,
  us_person_required: /\b(?:U\.?\s?S\.?|United States) persons?\b|\bITAR\b|\bEAR\b|\bexport[- ]control(?:led| regulations| laws)?/gi,
  sponsorship_now_unavailable: /\b(?:not|unable to|cannot|can't|won't|will not|do not|does not)\s+(?:\w+\s+){0,3}sponsor(?:ship)?\b|\b(?:visa|immigration|employment) sponsorship\b|\bH-1B\b|\bwithout (?:\w+\s+){0,2}sponsorship\b|\bauthorized to work\b/gi,
  sponsorship_future_unavailable: /\bnow or in the future\b|\b(?:not|unable to|cannot|won't|will not|do not)\s+(?:\w+\s+){0,3}sponsor(?:ship)?\b|\bfuture (?:visa )?sponsorship\b|\bH-1B\b/gi,
  clearance: /\b(?:active |current |ability to obtain (?:an? )?|eligib\w+ (?:to obtain|for) (?:an? )?)?(?:(?:top secret|ts\/sci|secret|public trust)(?: \/ ?sci)? )?(?:security )?clearance\b|\b(?:TS\/SCI|Top Secret)\b/gi,
};

// Short connectors that may sit between two hits and still read as one phrase.
const JOIN = /^(?:\s*(?:-|–|—|to|or|and|through|,|\/|between)\s*)+$/i;

export type Segment = { text: string; hit: boolean };

export function highlight(quote: string, field: GateField | null): Segment[] {
  const re = field ? PATTERNS[field] : undefined;
  if (!re) return [{ text: quote, hit: false }];
  const spans: [number, number][] = [];
  for (const m of quote.matchAll(new RegExp(re.source, re.flags))) {
    const span: [number, number] = [m.index, m.index + m[0].length];
    const last = spans[spans.length - 1];
    // "December 2026 – June 2027" is one phrase, not two.
    if (last && JOIN.test(quote.slice(last[1], span[0]))) last[1] = span[1];
    else spans.push(span);
  }
  if (!spans.length) return [{ text: quote, hit: false }];
  const out: Segment[] = [];
  let at = 0;
  for (const [a, b] of spans) {
    if (a > at) out.push({ text: quote.slice(at, a), hit: false });
    out.push({ text: quote.slice(a, b), hit: true });
    at = b;
  }
  if (at < quote.length) out.push({ text: quote.slice(at), hit: false });
  return out;
}
