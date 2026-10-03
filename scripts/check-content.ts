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
console.log(`${errors.length} errors, ${warns.length} warnings`);
if (errors.length || (strict && warns.length)) process.exit(1);
