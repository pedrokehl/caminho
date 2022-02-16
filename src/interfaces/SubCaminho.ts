import { ReduceParams, ValueBag } from '../types'
import { Caminho } from './Caminho'

export interface SubCaminho extends Caminho {
  reduce<T>(reduceParams: ReduceParams<T>): this
  getObservable(parentItem: ValueBag): Promise<ValueBag>
}
