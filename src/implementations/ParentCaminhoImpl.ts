import { lastValueFrom } from 'rxjs'
import { CaminhoOptions, ValueBag } from '../types'
import { SourceParams } from '../operators/generator'
import { ParentCaminho } from '../interfaces/ParentCaminho'
import { CaminhoAbstract } from './CaminhoAbstract'
import { getSubFrom } from '../subFrom'

export class ParentCaminhoImpl extends CaminhoAbstract implements ParentCaminho {
  protected subCaminhoFrom = getSubFrom(this.options)

  constructor(sourceOptions: SourceParams, protected options?: CaminhoOptions) {
    super(sourceOptions, options)
    this.run = this.run.bind(this)
  }

  public async run(initialBag: ValueBag = {}) {
    const observable$ = this.buildObservable(initialBag)
      .pipe(this.finalStep)

    await lastValueFrom(observable$)
  }
}
