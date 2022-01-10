import { Observable, map as rxjsMap } from 'rxjs'
import { CaminhoMapper, ValueBag } from '../types'

export enum OperationType {
    FETCH = 'fetch',
    MAP = 'map',
    SAVE = 'save'
}

export function pipe(
  observable: Observable<ValueBag>,
  mapFunction: CaminhoMapper,
  type: OperationType,
  provides?: string,
): Observable<ValueBag> {
  const getBag = getValueBagGetter(provides)

  async function wrappedMapper(valueBagPromise: Promise<ValueBag>) {
    // TODO: add log for each emitted data
    const valueBag = await valueBagPromise
    const value = await mapFunction(valueBag)
    return getBag(valueBag, value)
  }
  return observable.pipe(rxjsMap(wrappedMapper))
}

function getValueBagGetter(provides?: string) {
  if (provides) {
    // TODO: Proper typing for ValueBag!
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return function getValueBagWithProvides(valueBag: ValueBag, value: any) {
      return { ...valueBag, [provides]: value }
    }
  }

  return function getValueBag(valueBag: ValueBag) {
    return { ...valueBag }
  }
}
