---
root: true
targets: ["*"]
description: "Caminho project overview: purpose, structure, and development workflow"
globs: ["**/*"]
---

# Caminho

Caminho is an npm/jsr library for building efficient data pipelines in JavaScript environments.
It wraps RxJS to offer concurrency, batching, parallelism, and lossless backpressure behind a
small fluent API. Published as `caminho` on npm and `@pedrokehl/caminho` on jsr.

## Core concepts

- A flow starts from one of the `from*` entry points (`fromGenerator`, `fromArray`, `fromValue`, `fromFn`)
  and is defined by chaining steps: `pipe`, `parallel`, `batch` (a pipe option), `filter`, `reduce`.
- Each item travels through the flow inside a **ValueBag**: an object accumulating the values that
  steps declare via `provides`. Step functions receive the bag (or an array of bags for batch steps).
- `run(initialBag?)` executes the flow and resolves when the generator is done and every item has
  been processed by every step. A single Caminho instance can have multiple concurrent runs.
- `maxItemsFlowing` caps how many items exist in the flow at once (backpressure). The budget is
  shared between concurrent runs of the same instance.
- The bag type is tracked at compile time: `Caminho<Bag>` accumulates `provides` across steps.
  The default is `any`, untyped usage must keep compiling.

## Repository layout

- `src/Caminho.ts` - the class chaining operators and executing runs
- `src/from.ts` - flow entry points
- `src/types.ts` - public types, including the typed-bag machinery
- `src/operators/` - one file per operator, plus `helpers/`
- `src/utils/` - ValueBag helpers, `PendingDataControl` (backpressure accounting), loggers
- `test/unit`, `test/integration`, `test/property`, `test/types` - jest suites (ts-jest)
- `benchmark/` - tinybench micro-benchmarks and end-to-end scripts

## Development workflow

- `npm test` runs jest with coverage; **coverage thresholds are 100%** on every metric and must stay there.
- `npm run lint` uses eslint with `complexity: max 4` per function; keep functions small.
- `npm run build` emits CJS, ESM, and type declarations into `dist/` plus package.json type markers.
- `npm run benchmark:micro` runs the tinybench suite; CI compares results against main.
- Bug fixes follow TDD: add a failing regression test first, then fix, keep both in separate commits
  when practical. Commit messages follow Conventional Commits (`fix:`, `feat:`, `perf:`, `chore:`, `test:`).
