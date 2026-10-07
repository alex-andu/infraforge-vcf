# InfraForge VCF

A local, single-user learning platform for VMware Cloud Foundation 9 and the 2V0-17.25 exam. Owner: Alex.

Read before working:
- `docs/CURRENT_STATE.md`: status, known bugs, run commands, next tasks.
- `docs/DECISIONS.md`: settled decisions and pitfalls. Don't reopen them.
- `docs/CONTENT_STATUS.md`: what content exists.
- `docs/CONTENT_GUIDE.md`: how to add content.
- `docs/ARCHITECTURE.md`: code layout.

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
