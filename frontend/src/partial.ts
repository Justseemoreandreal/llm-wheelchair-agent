import type { LexiconEntry } from "./types";

/** Only safety-class partials are dispatched before the recognizer declares final. */
export function isImmediateSafetyPartial(text: string, entries: LexiconEntry[]): boolean {
  const normalized = text.replace(/\s+/g, "");
  return entries.some((entry) => (entry.priority === "P0" || entry.priority === "P1") && normalized.includes(entry.word));
}
