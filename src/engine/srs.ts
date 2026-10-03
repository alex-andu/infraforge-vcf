/**
 * Spaced repetition (Leitner boxes). A question enters the review queue when it is
 * answered incorrectly (or saved). Each correct review promotes it one box; an incorrect
 * review sends it back to box 1. Box 6 means "retained" and leaves the active queue.
 */
import type { ReviewItem } from '../state/types';

export const INTERVAL_DAYS = [0, 1, 3, 7, 14, 30, 60];
export const RETIRED_BOX = INTERVAL_DAYS.length - 1;
const DAY = 86_400_000;

/** Due times land at 04:00 local so a "day" matches how people study. */
function dueAt(now: number, days: number): number {
  if (days === 0) return now;
  const d = new Date(now + days * DAY);
  d.setHours(4, 0, 0, 0);
  return d.getTime();
}

export function addToReview(items: Record<string, ReviewItem>, qid: string, now: number): Record<string, ReviewItem> {
  const existing = items[qid];
  if (existing && existing.box < RETIRED_BOX) {
    return { ...items, [qid]: { ...existing, box: 1, due: dueAt(now, INTERVAL_DAYS[1]), lapses: existing.lapses + 1 } };
  }
  return { ...items, [qid]: { qid, box: 1, due: dueAt(now, INTERVAL_DAYS[1]), added: now, lapses: existing ? existing.lapses + 1 : 0, reviews: existing?.reviews ?? 0 } };
}

/** Apply the result of answering `qid` (in any mode) to the review queue. */
export function applyResult(items: Record<string, ReviewItem>, qid: string, score: number, now: number, isReviewSession: boolean): Record<string, ReviewItem> {
  const item = items[qid];
  const correct = score >= 0.999;
  if (!correct) return addToReview(items, qid, now);
  if (!item) return items;
  // Answering correctly outside a review session only counts once the item is due.
  if (!isReviewSession && item.due > now) return items;
  const box = Math.min(RETIRED_BOX, item.box + 1);
  return { ...items, [qid]: { ...item, box, due: dueAt(now, INTERVAL_DAYS[box]), reviews: item.reviews + 1 } };
}

export function dueItems(items: Record<string, ReviewItem>, now: number): ReviewItem[] {
  return Object.values(items).filter((i) => i.box < RETIRED_BOX && i.due <= now).sort((a, b) => a.due - b.due);
}

export function activeItems(items: Record<string, ReviewItem>): ReviewItem[] {
  return Object.values(items).filter((i) => i.box < RETIRED_BOX);
}
