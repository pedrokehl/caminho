import type { ValueBag, PipeGenericParams } from '../types'
import type { PipeParams } from '../operators/pipe'

export function getNewValueBag(oldValueBag: ValueBag, toProvide: string, newValue: unknown) {
  return { ...oldValueBag, [toProvide]: newValue }
}

export function buildValueBagAccumulator(pipesParams: PipeGenericParams[]) {
  const providablePipeParams = pipesParams.filter((pipeParams: PipeGenericParams) => pipeParams.provides)

  return function getAccumulatedParallelBag(valueBags: ValueBag[]) {
    function accumulateParallelProvidedValues(valueBag: ValueBag, pipeParams: PipeParams, index: number) {
      if (pipeParams.provides) {
        valueBag[pipeParams.provides] = valueBags[index][pipeParams.provides]
      }
      return valueBag
    }

    return providablePipeParams.reduce(accumulateParallelProvidedValues, { ...valueBags[0] })
  }
}
