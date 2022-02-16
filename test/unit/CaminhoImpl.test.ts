import { CaminhoAbstract } from '../../src/implementations/CaminhoAbstract'
import { getMockedGenerator } from '../mocks/generator.mock'

describe('Caminho Implementation', () => {
  class DummyCaminho extends CaminhoAbstract {}
  test('SubFlow cant be fully implemented on CaminhoImpl because of circular dependency', async () => {
    const parentSource = { fn: getMockedGenerator([1]), provides: 'parent' }
    const childSource = { fn: getMockedGenerator([1]), provides: 'child' }

    function getDummyCaminho() {
      return new DummyCaminho(parentSource)
        .subFlow((sub) => sub(childSource))
    }
    expect(getDummyCaminho).toThrow('Not implemented, called subCaminho for child')
  })
})
