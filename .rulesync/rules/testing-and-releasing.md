---
root: false
targets: ["*"]
description: "Testing conventions and the release process"
globs: ["test/**/*.ts", "package.json", "jsr.json", ".github/**/*"]
---

# Testing

- Coverage thresholds are **100%** for statements, branches, functions, and lines. New branches
  need tests in the same change; prefer unit tests for helper branches (see
  `test/unit/PendingDataControl.test.ts`) and integration tests for flow behavior.
- Bug fixes follow TDD: write the failing regression test first, verify it fails, then fix.
- Timing-sensitive assertions are banned; assert ordering properties and counts, not exact
  interleavings of step logs. Real-clock sleeps in tests should stay in the low milliseconds.
- Property-based tests live in `test/property/` (fast-check, keep `numRuns` around 15 so the suite
  stays fast). Compile-time typing assertions live in `test/types/` (expect-type).
- Source imports are extensionless; `npm run build` bundles `src/index.ts` with tsdown
  (`tsdown.config.ts`) into `dist/index.mjs` + `dist/index.cjs` with per-format declarations,
  so no extension rewriting or module-type markers are needed. Do not add extensions in `src/`.
- `npm run test:e2e` (test/e2e/, also part of the Build workflow) packs the package and consumes
  the tarball from a scratch project via `require()`, `import`, and `tsc` under `nodenext`.
  Any change to `package.json` `exports`/`files`, the build scripts, or tsconfigs must keep it green.

# AI rules

- `.rulesync/rules/` is the only committed source of truth for agent rules. The generated configs
  (`AGENTS.md`, `CLAUDE.md`, `.agents/`, `.claude/`, `.cursor/`) are gitignored; regenerate them
  locally with `npx rulesync generate --targets agentsmd,claudecode,cursor`.

# Benchmarks

- `npm run benchmark:micro` runs the tinybench suite; CI compares PRs against the main baseline and
  comments on regressions above 150%. Run it locally before and after performance-relevant changes
  and quote numbers in the commit message.
- Memory must be sampled from inside the pipeline (a step function), not from a timer; flows starve
  the macrotask queue.

# Releasing

1. Bump the version in **both** `package.json` and `jsr.json` — CI fails the build if they differ.
2. Update `CHANGELOG.md`, moving entries from Unreleased to the new version.
3. Publishing to npm and jsr happens via the `publish-npm.yml` and `publish-jsr.yml` workflows
   (npm uses trusted publishing; jsr publishes `src/` directly, so `src` must compile standalone).
4. The npm package ships the bundled `dist/` (CJS + ESM + per-format types) with an `exports`
   map; after packaging changes, run `npm run test:e2e` to verify the packed output end to end.
