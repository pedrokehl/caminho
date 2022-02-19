import { Caminho, from, ReduceParams, ValueBag } from '../../src'

import { getMockedGenerator } from '../mocks/generator.mock'
import { getNumberedArray } from '../mocks/array.mock'

describe('Sub-Caminho', () => {
  function getStepForSubCaminho<T>(subCaminho: Caminho, accumulator: ReduceParams<T>, provides: string) {
    return {
      fn: (valueBag: ValueBag) => subCaminho.run(valueBag, accumulator),
      provides,
      name: 'subCaminho',
    }
  }

  test('Should provide the Accumulated Value to the next parent step', async () => {
    const companySteps = getCompanySteps()
    const employeeSteps = getEmployeeSteps()

    const employeeCaminho = from(employeeSteps.generator)
      .pipe(employeeSteps.mapper)
      .pipe(employeeSteps.saver)

    await from(companySteps.generator)
      .pipe(companySteps.fetchStatus)
      .pipe(getStepForSubCaminho(employeeCaminho, employeeSteps.accumulator, 'savedEmployees'))
      .pipe(companySteps.saver)
      .run()

    assertCompanySteps(companySteps.saver.fn, { savedEmployees: 3 })
    assertEmployeeSteps(employeeSteps.saver.fn)
  })

  test('Should run correctly when child Caminho does not provide a value', async () => {
    const companySteps = getCompanySteps()
    const employeeSteps = getEmployeeSteps()

    const employeeCaminho = from(employeeSteps.generator)
      .pipe(employeeSteps.mapper)
      .pipe(employeeSteps.saver)

    await from(companySteps.generator)
      .pipe(companySteps.fetchStatus)
      .pipe({ fn: employeeCaminho.run })
      .pipe(companySteps.saver)
      .run()

    assertCompanySteps(companySteps.saver.fn)
    assertEmployeeSteps(employeeSteps.saver.fn)
  })

  test('Should work fine when SubCaminho uses batch and concurrency', async () => {
    const companySteps = getCompanySteps()
    const employeeSteps = getEmployeeSteps()

    const finalStepCompanyFn = jest.fn().mockName('finalStepCompany').mockResolvedValue(null)
    const finalStepEmployeeFn = jest.fn().mockName('finalStepEmployee').mockResolvedValue(null)

    const finalStepCompany = { fn: finalStepCompanyFn }
    const finalStepEmployee = { fn: finalStepEmployeeFn }

    const employeeCaminho = from({ ...employeeSteps.generator, maxItemsFlowing: 1 })
      .pipe({ ...employeeSteps.mapper, maxConcurrency: 1 })
      .pipe({ ...employeeSteps.saver, batch: { maxSize: 10, timeoutMs: 5 } })
      .pipe(finalStepEmployee)

    await from({ ...companySteps.generator, maxItemsFlowing: 2 })
      .pipe(companySteps.fetchStatus)
      .pipe(getStepForSubCaminho(employeeCaminho, employeeSteps.accumulator, 'savedEmployees'))
      .pipe({ ...companySteps.saver, batch: { maxSize: 2, timeoutMs: 10 } })
      .pipe(finalStepCompany)
      .run()

    assertCompanySteps(finalStepCompany.fn, { savedEmployees: 3 })
    assertEmployeeSteps(finalStepEmployee.fn)
  })

  test('Should work with multiple sub Caminhos in the same parent Caminho', async () => {
    const companySteps = getCompanySteps()
    const employeeSteps = getEmployeeSteps()
    const internSteps = getEmployeeSteps()

    const internCaminho = from(internSteps.generator)
      .pipe(internSteps.mapper)
      .pipe(internSteps.saver)

    const employeeCaminho = from(employeeSteps.generator)
      .pipe(employeeSteps.mapper)
      .pipe(employeeSteps.saver)

    await from(companySteps.generator)
      .pipe(companySteps.fetchStatus)
      .pipe(getStepForSubCaminho(employeeCaminho, employeeSteps.accumulator, 'savedEmployees'))
      .pipe(getStepForSubCaminho(internCaminho, internSteps.accumulator, 'savedInterns'))
      .pipe(companySteps.saver)
      .run()

    assertEmployeeSteps(employeeSteps.saver.fn)
    assertEmployeeSteps(internSteps.saver.fn, { savedEmployees: 3 })
    assertCompanySteps(companySteps.saver.fn, { savedEmployees: 3, savedInterns: 3 })
  })

  test('Should process multiple nested Caminhos', async () => {
    const companySteps = getCompanySteps()
    const employeeSteps = getEmployeeSteps()
    const documentSteps = getDocumentSteps()

    const documentsCaminho = from(documentSteps.generator)
      .pipe(documentSteps.saver)

    const employeeCaminho = from(employeeSteps.generator)
      .pipe(employeeSteps.mapper)
      .pipe(getStepForSubCaminho(documentsCaminho, documentSteps.accumulator, 'savedDocuments'))
      .pipe(employeeSteps.saver)

    await from(companySteps.generator)
      .pipe(companySteps.fetchStatus)
      .pipe(getStepForSubCaminho(employeeCaminho, employeeSteps.accumulator, 'savedEmployees'))
      .pipe(companySteps.saver)
      .run()

    assertDocumentSteps(documentSteps.saver.fn)
    assertEmployeeSteps(employeeSteps.saver.fn, { savedDocuments: 2 })
    assertCompanySteps(companySteps.saver.fn, { savedEmployees: 3 })
  })
})

function getCompanySteps() {
  const fetchCompanyStatusFn = jest.fn()
    .mockName('fetchCompanyStatus')
    .mockImplementation((valueBag: ValueBag) => valueBag.companyId % 2 !== 0)

  const saveCompanyFn = jest.fn().mockName('saveCompany').mockResolvedValue([])
  const companyIdGeneratorFn = getMockedGenerator(getNumberedArray(3))

  const generator = { fn: companyIdGeneratorFn, provides: 'companyId' }
  const fetchStatus = { fn: fetchCompanyStatusFn, provides: 'companyStatus' }
  const saver = { fn: saveCompanyFn }

  return {
    generator,
    fetchStatus,
    saver,
  }
}

function getEmployeeSteps() {
  function mapEmployeeFn(valueBag: ValueBag) {
    return {
      companyId: valueBag.companyId,
      employeeName: valueBag.employeeName,
      status: valueBag.companyStatus ? 'Employed' : 'Unemployed',
    }
  }

  const saveEmployeeFn = jest.fn().mockName('saveEmployee').mockResolvedValue([])
  const employeeGeneratorFn = getMockedGenerator(['Elon', 'Bezos', 'Cook'])

  const generator = { fn: employeeGeneratorFn, provides: 'employeeName' }
  const mapper = { fn: mapEmployeeFn, provides: 'mappedEmployee' }
  const saver = { fn: saveEmployeeFn }
  const accumulator: ReduceParams<number> = { fn: (acc: number) => acc + 1, seed: 0 }

  return {
    generator,
    mapper,
    saver,
    accumulator,
  }
}

function getDocumentSteps() {
  const generatorFn = getMockedGenerator([1, 2])
  const saverFn = jest.fn().mockName('saveDocument').mockResolvedValue(null)

  const generator = { fn: generatorFn, provides: 'documentId' }
  const saver = { fn: saverFn }
  const accumulator: ReduceParams<number> = { fn: (acc: number) => acc + 1, seed: 0 }

  return {
    generator,
    saver,
    accumulator,
  }
}

function assertCompanySteps(lastStepMock: jest.Mock, additionalValues?: ValueBag) {
  expect(lastStepMock).toHaveBeenCalledTimes(3)
  const companyParams = lastStepMock.mock.calls.map((params) => params[0])
  expect(companyParams).toEqual(expect.arrayContaining([
    { companyId: 1, companyStatus: true, ...additionalValues },
    { companyId: 2, companyStatus: false, ...additionalValues },
    { companyId: 3, companyStatus: true, ...additionalValues },
  ]))
}

function assertEmployeeSteps(lastStepMock: jest.Mock, additionalValues?: ValueBag) {
  expect(lastStepMock).toHaveBeenCalledTimes(9)
  const employeeParams = lastStepMock.mock.calls.map((params) => params[0])
  expect(employeeParams).toEqual(expect.arrayContaining([
    mockEmployeeResult(1, true, 'Elon', 'Employed', additionalValues),
    mockEmployeeResult(1, true, 'Bezos', 'Employed', additionalValues),
    mockEmployeeResult(1, true, 'Cook', 'Employed', additionalValues),

    mockEmployeeResult(2, false, 'Elon', 'Unemployed', additionalValues),
    mockEmployeeResult(2, false, 'Bezos', 'Unemployed', additionalValues),
    mockEmployeeResult(2, false, 'Cook', 'Unemployed', additionalValues),

    mockEmployeeResult(3, true, 'Elon', 'Employed', additionalValues),
    mockEmployeeResult(3, true, 'Bezos', 'Employed', additionalValues),
    mockEmployeeResult(3, true, 'Cook', 'Employed', additionalValues),
  ]))
}

function assertDocumentSteps(lastStepMock: jest.Mock) {
  expect(lastStepMock).toHaveBeenCalledTimes(18)
  const employeeParams = lastStepMock.mock.calls.map((params) => params[0])
  expect(employeeParams).toEqual(expect.arrayContaining([
    mockEmployeeResult(1, true, 'Elon', 'Employed', { documentId: 1 }),
    mockEmployeeResult(1, true, 'Bezos', 'Employed', { documentId: 1 }),
    mockEmployeeResult(1, true, 'Cook', 'Employed', { documentId: 1 }),
    mockEmployeeResult(2, false, 'Elon', 'Unemployed', { documentId: 1 }),
    mockEmployeeResult(2, false, 'Bezos', 'Unemployed', { documentId: 1 }),
    mockEmployeeResult(2, false, 'Cook', 'Unemployed', { documentId: 1 }),
    mockEmployeeResult(3, true, 'Elon', 'Employed', { documentId: 1 }),
    mockEmployeeResult(3, true, 'Bezos', 'Employed', { documentId: 1 }),
    mockEmployeeResult(3, true, 'Cook', 'Employed', { documentId: 1 }),

    mockEmployeeResult(1, true, 'Elon', 'Employed', { documentId: 2 }),
    mockEmployeeResult(1, true, 'Bezos', 'Employed', { documentId: 2 }),
    mockEmployeeResult(1, true, 'Cook', 'Employed', { documentId: 2 }),
    mockEmployeeResult(2, false, 'Elon', 'Unemployed', { documentId: 2 }),
    mockEmployeeResult(2, false, 'Bezos', 'Unemployed', { documentId: 2 }),
    mockEmployeeResult(2, false, 'Cook', 'Unemployed', { documentId: 2 }),
    mockEmployeeResult(3, true, 'Elon', 'Employed', { documentId: 2 }),
    mockEmployeeResult(3, true, 'Bezos', 'Employed', { documentId: 2 }),
    mockEmployeeResult(3, true, 'Cook', 'Employed', { documentId: 2 }),
  ]))
}

function mockEmployeeResult(
  companyId: number,
  companyStatus: boolean,
  employeeName: string,
  employeeStatus: string,
  additionalValues: ValueBag = {},
) {
  return {
    companyId,
    companyStatus,
    employeeName,
    mappedEmployee: { companyId, employeeName, status: employeeStatus },
    ...additionalValues,
  }
}
