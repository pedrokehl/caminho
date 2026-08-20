import type { ValueBag, PipeGenericParams, PipeGenericParamsProvides } from '../types'

export function getNewValueBag(oldValueBag: ValueBag, toProvide: string, newValue: unknown) {
  return { ...oldValueBag, [toProvide]: newValue }
}

function isPipeParamsProvides(pipeParams: PipeGenericParams): pipeParams is PipeGenericParamsProvides {
  return !!pipeParams.provides
}

export function buildValueBagAccumulator(pipesParams: PipeGenericParams[]) {
  const providablePipeParams = pipesParams.filter(isPipeParamsProvides)

  return function getAccumulatedParallelBag(valueBags: ValueBag[]) {
    function accumulateProvidedValues(valueBag: ValueBag, pipeParams: PipeGenericParamsProvides, index: number) {
      valueBag[pipeParams.provides] = valueBags[index][pipeParams.provides]
      return valueBag
    }

    return providablePipeParams.reduce(accumulateProvidedValues, { ...valueBags[0] })
  }
}
