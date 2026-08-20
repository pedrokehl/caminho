---
root: false
targets: ["*"]
description: "Non-negotiable invariants of the Caminho flow engine"
globs: ["src/**/*.ts"]
---

# Flow engine invariants

Violating any of these is a bug, even if all current tests pass. Add a regression test when you
find code that breaks one.

## Streaming, never buffering

- Caminho must **never hold the whole generated dataset in memory**. Items stream through the
  operators; with `maxItemsFlowing` set, at most that many items exist in the flow at once.
- Any new operator or join logic must hold at most O(maxItemsFlowing) items, not O(total items).

## Item integrity

- Values from different items must never be mixed into the same ValueBag. `parallel()` tags each
  bag with a `PARALLEL_ITEM_ID` symbol and joins branch outputs by that id — never join concurrent
  branches by emission index (`zip`), because concurrent steps emit in completion order.
- Steps receive a defensive copy of the bag: mutating a bag inside a step must not leak into other
  steps. This is a tested public contract; do not remove the copies for performance.

## Emission order

- Steps emit in **completion order**, not generator order. This is consistent across pipe, batch,
  and parallel, and maximizes throughput. Do not "fix" ordering without an explicit design change.

## Per-run isolation

- One Caminho instance supports concurrent `run()` calls. Any mutable state for a run must live
  inside the `operatorApplierWithRunId` closure (see `reduce`), never in the operator's outer
  closure, which is shared by all runs.

## Backpressure accounting (PendingDataControl)

- Admission is **atomic**: an item enters the flow only through `acquireSlot`, which counts the
  item synchronously (immediately when below the limit, or inside the FIFO wake loop when a slot
  frees up). Never resolve capacity waiters without consuming the slot in the same synchronous
  step — broadcasting wakeups lets concurrent runs exceed `maxItemsFlowing`.
- The generator wrapper acquires a slot **before** pulling the next value, so the source never
  produces ahead of capacity.
- Decrements happen in the final tap of `run()` and in `filter`/`reduce` when they drop items.
- `run()` destroys the run's bucket in a `finally`; `destroyBucket` removes the bucket's queued
  slot requests (a torn-down run must not admit items) and, like `decrement`, hands freed
  capacity to the remaining waiters, otherwise concurrent generators deadlock.
- After any run finishes (success or error), `getNumberOfItemsFlowing()` must be 0, and the peak
  across concurrent runs must never exceed `maxItemsFlowing` (tested in `concurrentRuns.test.ts`).

## Public API stability

- `ValueBag` defaults to `any`; untyped flows must keep compiling forever. Typed-bag features may
  only add inference, never require annotations.
- Bags are open (`OpenBag`): step functions and run results must always accept properties carried
  by `run(initialBag)`, which the flow cannot know at compile time. Never narrow step-fn
  parameters to the exact inferred bag type.
- Every step function referenced in logs falls back to `fn.name`; keep step wrappers named functions.
