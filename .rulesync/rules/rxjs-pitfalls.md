---
root: false
targets: ["*"]
description: "RxJS and async-generator pitfalls specific to this codebase"
globs: ["src/**/*.ts", "test/**/*.ts"]
---

# RxJS and async-generator pitfalls

Hard-earned lessons; check against these before changing operators.

## mergeMap emits in completion order

`mergeMap` with concurrency emits results as they finish, not as they arrived. Anything that
correlates two streams must match by item identity (see `joinByItemId` in `parallel.ts`), never by
index or arrival order. `zip` pairs by index and silently corrupts data under variable latency.

## bufferTime runs a permanent timer

`bufferTime` keeps a timer running for the whole subscription and emits empty buffers. This repo
uses the custom `bufferSizeOrTimeout` operator instead: timer armed only when the buffer is
non-empty, timeout measured from the first buffered item, nothing emitted while idle. Use it for
any new buffering need.

## Async generator teardown is deferred

When rxjs unsubscribes `from(asyncGenerator)`, `iterator.return()` is queued: a generator suspended
at an internal `await` resumes, keeps executing until the next `yield`, and only then finalizes.
Side effects placed between an `await` and a `yield` (for example counters) can therefore run for
values that are never delivered. Keep generator bodies side-effect free; do accounting in the
observable pipeline where teardown is synchronous.

## Microtask starvation

Flows made of immediately-resolving promises form one long microtask chain; `setTimeout`/
`setInterval` callbacks do not run until the chain ends. Consequences:

- Timer-based sampling or watchdogs around a running flow measure nothing (see the in-pipeline
  memory sampling in `benchmark/micro.benchmark.ts`).
- Tests asserting exact interleavings of step logs are inherently brittle; assert ordering
  properties (first save before last generate, counts per step) instead of exact sequences.

## Backpressure waiters

`PendingDataControl.acquireSlot` queues when at capacity; `decrement`/`destroyBucket` admit queued
waiters FIFO, counting the slot synchronously per admission. If you add a code path that reduces
`size` some other way, it must run the admission loop or generators will hang. Never resolve a
waiter with `true` without consuming its slot in the same synchronous step, and never drop a
waiter without settling it (`false`): an unsettled promise leaves the generator wrapper suspended
forever, so `iterator.return()` never processes and the user generator's `finally` never runs.
