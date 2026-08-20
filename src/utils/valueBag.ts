import type { ValueBag, PipeGenericParams, PipeGenericParamsProvides } from '../types'

export function getNewValueBag(oldValueBag: ValueBag, toProvide: string, newValue: unknown) {
  return { ...oldValueBag, [toProvide]: newValue }
}

function isPipeParamsProvides(pipeParams: PipeGenericParams): pipeParams is PipeGenericParamsProvides {
  return !!pipeParams.provides
}

type ProvidableEntry = { pipeParams: PipeGenericParamsProvides, branchIndex: number }

export function buildValueBagAccumulator(pipesParams: PipeGenericParams[]) {
  // The branch index must be preserved: the provided value has to be read
  // from the output of the branch that actually produced it.
  const providableEntries: ProvidableEntry[] = pipesParams
    .map((pipeParams, branchIndex) => ({ pipeParams, branchIndex }))
    .filter((entry): entry is ProvidableEntry => isPipeParamsProvides(entry.pipeParams))

  return function getAccumulatedParallelBag(valueBags: ValueBag[]) {
    function accumulateProvidedValues(valueBag: ValueBag, { pipeParams, branchIndex }: ProvidableEntry) {
      valueBag[pipeParams.provides] = valueBags[branchIndex][pipeParams.provides]
      return valueBag
    }

    return providableEntries.reduce(accumulateProvidedValues, { ...valueBags[0] })
  }
}
