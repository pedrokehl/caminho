import { PipeGenericParams } from '../types'
import { SourceParams } from '../operators/generator'
import { SubCaminho } from './SubCaminho'

export interface Caminho {
  pipe(params: PipeGenericParams): this
  parallel(params: PipeGenericParams[]): this
  subFlow(
    submitSubFlow: (from: (sourceParams: SourceParams) => SubCaminho) => SubCaminho,
    maxConcurrency?: number,
  ): this
}
