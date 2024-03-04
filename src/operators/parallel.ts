import { map, Observable, share, zip } from 'rxjs'
import type { PipeGenericParams, ValueBag } from '../types'
import { buildValueBagAccumulator } from '../utils/valueBag'
import { OperatorApplier } from './helpers/operatorHelpers'

export function parallel(params: PipeGenericParams[], operatorAppliers: OperatorApplier[]): OperatorApplier {
  function parallelOperatorsApplier(observable: Observable<ValueBag>) {
    return zip(operatorAppliers.map((operatorApplier) => operatorApplier(observable)))
  }

  const shareObservable = share<ValueBag>()
  const mapper = map(buildValueBagAccumulator(params))

  return (observable) => {
    const multicaster = observable.pipe(shareObservable)

    return parallelOperatorsApplier(multicaster)
      .pipe(mapper)
  }
}
