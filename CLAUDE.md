# InfraForge VCF

A local, single-user learning platform for VMware Cloud Foundation 9 and the 2V0-17.25 exam. Owner: Alex.

Read before working:
- `docs/CURRENT_STATE.md`: status, known bugs, run commands, next tasks.
- `docs/DECISIONS.md`: settled decisions and pitfalls. Don't reopen them.
- `docs/CONTENT_STATUS.md`: what content exists.
- `docs/CONTENT_GUIDE.md`: how to add content.
- `docs/ARCHITECTURE.md`: code layout.
- 
# Context Management

- Do not scan the entire repository by default.
- Start with files directly relevant to the current task.
- Use targeted search before opening large files.
- Treat completed modules as stable unless tests indicate otherwise.
- Do not regenerate existing educational content.
- Do not modify unrelated modules.
- Keep implementation scope narrow.
- Update docs/CURRENT_STATE.md after completing meaningful work.
  # Project State

The authoritative project status is in:
docs/CURRENT_STATE.md

Architecture decisions:
docs/DECISIONS.md

Curriculum/content completion:
docs/CONTENT_STATUS.md

Do not store transient project history in CLAUDE.md.
## Rules

- Talk to Alex in **Romanian**. UI strings are Romanian; lessons, questions, labs and code comments are English.
- **Never commit credentials** (passwords, tokens, depot logins) from Alex's lab files. Use topology only: FQDNs, IPs, VLANs.
- Content goes in `content/` as YAML/Markdown that matches `src/content/schema.ts`. Never hard-code content in React.
- No fake functionality. Simulators must say they are simulators. Unverified facts are written as "check your version", never stated as fact.
- No backend, accounts or AI features. Desktop only.
- Changing `PersistedState` (`src/state/types.ts`) needs a migration, so existing progress in IndexedDB survives.
- Ask Alex before pushing, creating repos or opening PRs, and before any destructive change to his lab.

## Before calling work done

```bash
npm run content:check -- --strict   # 0 errors, 0 warnings
npm test
npm run build
```

For UI changes, run `scripts/smoke.mjs`, and `scripts/flows.mjs` too if you touched quiz, exam, incident or lab flows, against `npm run dev`. In the cloud container, set `PW_CHROMIUM=/opt/pw-browsers/chromium-1194/chrome-linux/chrome` and never run `playwright install`.
