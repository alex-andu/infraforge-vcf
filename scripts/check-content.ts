/**
 * npm run content:check [-- --strict] [-- --only <path-fragment>]
 * Validates all content. Errors fail the build; warnings (dangling cross-references,
 * short lessons) fail only with --strict.
 */
import { loadContent } from './content-loader.ts';

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const onlyIdx = args.indexOf('--only');
const only = onlyIdx >= 0 ? args[onlyIdx + 1] : undefined;

const c = loadContent();
const issues = only ? c.issues.filter((i) => i.file.includes(only) || i.message.includes(only)) : c.issues;
const errors = issues.filter((i) => i.level === 'error');
const warns = issues.filter((i) => i.level === 'warn');

for (const i of [...errors, ...warns]) console.log(`${i.level === 'error' ? 'ERROR' : 'warn '} ${i.file}: ${i.message}`);

const words = c.lessons.reduce((n, l) => n + l.words, 0);
console.log(`\n${c.lessons.length} lessons (${words.toLocaleString()} words), ${c.questions.length} questions, ${c.labs.length} labs, ` +
  `${c.incidents.length} incidents, ${c.glossary.length} glossary terms, ${c.commands.length} commands, ` +
  `${c.components.length} components, ${c.diagrams.length} diagrams, ${c.scenarios.length} scenarios`);
const itemCounts = new Map<string, number>();
for (const question of c.questions) if (question.objectiveItem) itemCounts.set(question.objectiveItem, (itemCounts.get(question.objectiveItem) ?? 0) + 1);
const itemRows = c.objectives.flatMap((objective) => objective.items.map((item) => ({ objective: objective.id, ...item, questions: itemCounts.get(item.id) ?? 0 })));
const objectiveQuestions = c.questions.filter((question) => question.objective);
const mappedQuestions = objectiveQuestions.filter((question) => question.objectiveItem);
const atTarget = itemRows.filter((item) => item.questions >= 5);
console.log(`Exam item coverage: ${mappedQuestions.length}/${objectiveQuestions.length} objective-tagged questions mapped; ${atTarget.length}/${itemRows.length} items have at least 5 questions.`);
if (args.includes('--coverage')) {
  console.log('\nItem\tQuestions\tOfficial exam-guide text');
  for (const item of itemRows) console.log(`${item.id}\t${item.questions}\t${item.text}`);
} else {
  const gaps = itemRows.filter((item) => item.questions < 5).map((item) => `${item.id}=${item.questions}`);
  console.log(`Items below the 5-question target (${gaps.length}): ${gaps.join(', ') || 'none'}`);
}
console.log(`${errors.length} errors, ${warns.length} warnings`);
if (errors.length || (strict && warns.length)) process.exit(1);
