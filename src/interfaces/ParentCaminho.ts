import { ValueBag } from '../types'
import { Caminho } from './Caminho'

export interface ParentCaminho extends Caminho {
  run(initialBag?: ValueBag): Promise<void>
}
