import { last, lastValueFrom, map, reduce } from 'rxjs'
import { CaminhoOptions, ReduceParams, ValueBag } from '../types'
import { CaminhoAbstract } from './CaminhoAbstract'
import { getNewValueBag } from '../utils/valueBag'
import { SubCaminho } from '../interfaces/SubCaminho'
import { SourceParams } from '../operators/generator'
import { getSubFrom } from '../subFrom'

type ParentItemMapper = (parentItem: ValueBag, child: ValueBag) => ValueBag

export class SubCaminhoImpl extends CaminhoAbstract implements SubCaminho {
  private aggregator = last<ValueBag>()
  private parentItemMapper: ParentItemMapper = (parentItem: ValueBag) => parentItem
  protected subCaminhoFrom = getSubFrom(this.options)

  constructor(sourceOptions: SourceParams, protected options?: CaminhoOptions) {
    super(sourceOptions, options)
    this.run = this.run.bind(this)
  }

  public reduce<T>(reduceParams: ReduceParams<T>): this {
    this.aggregator = reduce(reduceParams.fn, reduceParams.seed)
    this.parentItemMapper = function parentItemMapper(parentItem: ValueBag, child: ValueBag) {
      return getNewValueBag(parentItem, reduceParams.provides, child)
    }
    return this
  }

  public run(initialBag: ValueBag): Promise<ValueBag> {
    const observable$ = this.buildObservable(initialBag)
      .pipe(this.finalStep)
      .pipe(this.aggregator)
      .pipe(map((child: ValueBag) => this.parentItemMapper(initialBag, child)))

    return lastValueFrom(observable$)
  }
}
