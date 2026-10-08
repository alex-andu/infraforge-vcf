import fs from 'node:fs';
import path from 'node:path';
import { loadContent } from './content-loader.ts';

const content = loadContent();
const target = 5;
const objectiveQuestions = content.questions.filter((question) => question.objective);
const mappedQuestions = objectiveQuestions.filter((question) => question.objectiveItem);
const rows = content.objectives.flatMap((objective) => objective.items.map((item) => {
  const questions = content.questions.filter((question) => question.objectiveItem === item.id);
  const lessons = [...new Set(questions.map((question) => question.lesson))].sort();
  return { objective, item, questions, lessons };
}));
const atTarget = rows.filter((row) => row.questions.length >= target);
const zero = rows.filter((row) => row.questions.length === 0);

const lines: string[] = [
  '# Official exam-item coverage',
  '',
  'Generated from `content/objectives.yaml` and the `objectiveItem` tags in `content/questions/*.yaml`.',
  'The item identifiers are repository ordinals attached to the official item text; they are not identifiers printed by Broadcom.',
  `The **${target}-question target is an internal content-quality threshold**, not an official exam weight or scoring rule.`,
  '',
  `- Official items represented: **${rows.length - zero.length}/${rows.length}**`,
  `- Items meeting the internal target: **${atTarget.length}/${rows.length}**`,
  `- Objective-tagged questions mapped to one primary item: **${mappedQuestions.length}/${objectiveQuestions.length}**`,
  `- Questions outside a testable objective: **${content.questions.length - objectiveQuestions.length}**`,
  '',
];

for (const objective of content.objectives) {
  lines.push(`## ${objective.id} — ${objective.title}`, '', '| Item | Official exam-guide text | Questions | Question-linked lessons | Status |', '|---|---|---:|---:|---|');
  for (const row of rows.filter((candidate) => candidate.objective.id === objective.id)) {
    const status = row.questions.length >= target ? 'Target met' : row.questions.length === 0 ? 'Missing' : `Needs ${target - row.questions.length}`;
    lines.push(`| ${row.item.id} | ${row.item.text.replace(/\|/g, '\\|')} | ${row.questions.length} | ${row.lessons.length} | ${status} |`);
  }
  lines.push('');
}

lines.push(
  '## Interpretation rules',
  '',
  '- Every question with an `objective` has exactly one primary `objectiveItem`. Composite questions use the item containing the main decision being graded.',
  '- Question-linked lesson counts show where tagged questions point; they do not by themselves prove that a dedicated lesson section is complete.',
  '- General API and PowerCLI questions under objective 4.4 currently map to 4.4.10 because extensibility and process automation are their nearest explicit exam item. Keep this mapping under review when the official guide changes.',
  '- The three exam-strategy questions without an objective remain outside mock-exam objective allocation by design.',
  '- Candidate-profile prerequisites such as Kubernetes, DNS/NTP/certificates and HCX are tracked alongside this item report even when they are not separate testable items.',
  '',
  '## Priority queue from measured gaps',
  '',
);

for (const row of rows.filter((candidate) => candidate.questions.length < target).sort((a, b) => a.questions.length - b.questions.length || a.item.id.localeCompare(b.item.id, undefined, { numeric: true }))) {
  lines.push(`- **${row.item.id}** — ${row.item.text}: ${row.questions.length}/${target} questions.`);
}

lines.push('', 'Candidate-profile follow-up: foundational Kubernetes and DNS/NTP now have dedicated lessons; VCF Operations HCX remains a content gap.', '');

const output = `${lines.join('\n').trimEnd()}\n`;
if (process.argv.includes('--write')) {
  const destination = path.resolve(import.meta.dirname, '../docs/EXAM_COVERAGE.md');
  fs.writeFileSync(destination, output, 'utf8');
  console.log(`Wrote ${destination}`);
} else {
  process.stdout.write(output);
}
