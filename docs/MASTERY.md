# How mastery, review and readiness are calculated

Everything is computed in the browser from your own history (stored in IndexedDB). Source: `src/engine/`.

## Topic mastery (`mastery.ts`)

Mastery is per topic (e.g. `vsan-esa`, `nsx-edge`, `sddc-manager-lifecycle`) and is **not** a raw percentage of correct answers.

1. **Knowledge**: weighted accuracy over every answer tagged with the topic.
   - Weight = difficulty (foundation 0.6, intermediate 1, advanced 1.4, expert 1.8) × mode (diagnostic 0.7, lesson 0.9, quiz 1, review 1.1, exam 1.2) × recency (half-life 21 days).
   - A Bayesian prior worth 2 answers is added: your diagnostic result for that area, or a pessimistic 25% if you skipped the diagnostic. One correct answer is therefore not "100%".
2. **Confidence**: `1 − e^(−evidence/4)`. Little evidence keeps the knowledge term small.
3. **Coverage**: share of the topic's lessons you completed.
4. **Practice**: share of the topic's labs completed and incidents solved.
5. **Penalties**: overdue reviews and repeated lapses (max −20), and repeatedly confusing this topic with another one (max −15).

```
score = 0.6 × knowledge × (0.35 + 0.65 × confidence) + 0.25 × coverage + 0.15 × practice − penalties
```

States: **not started** → **in progress** → **completed** (all lessons done) → **mastered** (score ≥ 80, confidence ≥ 0.6 and ≥ 70% on advanced/expert questions). **Needs review** overrides when ≥ 3 reviews are due, recent accuracy is under 50%, or a mastered topic has been idle for 30 days.

## Spaced repetition (`srs.ts`)

A question enters the review queue when you get it wrong (or save it). Leitner boxes with intervals of 1, 3, 7, 14, 30 and 60 days. A correct review promotes it one box, a wrong one sends it back to box 1. After box 6 it is retired. Due times land at 04:00 local time.

## Exam readiness (`readiness.ts`)

Eight weighted signals:

| Signal | Weight |
|---|---|
| Mastery of exam-objective topics (weighted by objective items) | 30% |
| Curriculum completed | 15% |
| Mock exams (average of last 3) | 15% |
| Recent accuracy (last 60 answers) | 12% |
| Advanced/expert accuracy | 10% |
| Weak topics remaining | 6% |
| Retention | 6% |
| Scenarios and troubleshooting | 6% |

Readiness is **capped at 60% until you take a mock exam**, and decays 5% if your last mock is older than 21 days.

## Mock exams (`exam.ts`)

60 questions, 135 minutes, matching the official 2V0-17.25 format. Questions are distributed across objectives proportionally to the number of items each objective lists in the exam guide, preferring questions you have seen least. Broadcom reports a scaled score (300 = pass) and does not publish the raw cut score; the platform maps 70% raw to 300 as an **estimate**.

## XP and levels (`gamification.ts`)

XP rewards effort (lessons 50, answers 4–12 by difficulty, lab steps 10, lab 100, incidents up to 150, mock exam 120, scenario 60). XP does not affect mastery or readiness.
