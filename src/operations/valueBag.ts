import { ValueBag, PipeGenericParams } from '../types'
import { pipeHasProvides } from './operationDiscrimator'
import { PipeParams, PipeParamsProvides } from './pipe'

export function getNewValueBag(oldValueBag: ValueBag, toProvide: string, newValue: unknown) {
  return { ...oldValueBag, [toProvide]: newValue }
}

export function buildValueBagAccumulator(pipesParams: PipeGenericParams[]) {
  const providablePipeParams = (pipesParams as PipeParams[]).filter(pipeHasProvides)

  return function getAccumulatedParallelBag(valueBags: ValueBag[]) {
    function accumulateParallelProvidedValues(valueBag: ValueBag, pipeParams: PipeParamsProvides, index: number) {
      if ((pipeParams as PipeParamsProvides).provides) {
        valueBag[pipeParams.provides] = valueBags[index][pipeParams.provides]
      }
      return valueBag
    }

    return providablePipeParams.reduce(accumulateParallelProvidedValues, { ...valueBags[0] })
  }
}
