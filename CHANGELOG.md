# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- `parallel()` no longer mixes values across items when branches emit out of completion order.
  Items are tracked by identity instead of being zipped by emission index.
- `parallel()` reads provided values from the correct branch when providing and
  non-providing steps are mixed.
- `reduce()` no longer leaks kept values between concurrent runs of the same Caminho instance.
- Items are accounted when actually delivered into the flow, fixing a phantom item leak
  when a run errored while its generator waited for backpressure capacity.
- The ESM build is now loadable by Node: `dist` is bundled with tsdown into `index.mjs` and
  `index.cjs` with per-format type declarations (`.d.mts`/`.d.cts`). The package `exports` map
  gained real `import`/`require` conditions with their own `types`, and the root `types` field
  no longer points to a nonexistent file.
- `Caminho.filter()` interface no longer requires a `name`.
- `PendingDataControl` no longer stores `NaN` when decrementing an untracked bucket.
- The npm package no longer ships compiler artifacts, and the bundled output is a fraction
  of the previous multi-file dist size.

### Added

- Generic `ValueBag` typing: the bag type accumulates `provides` across `pipe`, `parallel`,
  `batch` and `reduce` steps. Untyped flows keep working unchanged (`ValueBag` defaults to `any`).
- LICENSE file (ISC) and `engines.node >= 18`.
- Property-based tests (fast-check), concurrent-run tests, and compile-time typing tests (expect-type).
- Tinybench micro-benchmark suite with peak-heap tracking and a CI benchmark regression job.
- End-to-end packaging test (`npm run test:e2e`, also run by the Build workflow): packs the
  package, installs the tarball into a scratch project, and consumes it via `require()`,
  `import`, and `tsc` under `nodenext` for both module systems.

### Changed

- Backpressure waits are promise-based instead of polling every 10ms,
  roughly 10x faster wakeups on backpressure-heavy flows.
- Batch buffering uses a custom first-item-timeout operator instead of `bufferTime`,
  so no timer runs while the flow is idle and `timeoutMs` counts from the first buffered item.
- Step timing uses `performance.now()` and logger callbacks are no-op stubs when not configured,
  removing two allocations per item per step.
- CI tests against Node 18, 20, 22 and 24; the audit additionally runs on a weekly schedule.
  `jsr.json` version is checked against `package.json` at build time.

## [1.7.6] - 2025

Last release before this changelog was introduced.
See the [release history](https://github.com/pedrokehl/caminho/releases) for earlier versions.
