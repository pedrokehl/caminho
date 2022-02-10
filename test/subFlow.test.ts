import { Accumulator, Caminho } from '../src/caminho'
import { ValueBag } from '../src/types'
import { getNumberedArray } from './mocks/array.mock'
import { getMockedGenerator } from './mocks/generator.mock'

describe('Sub-Flow', () => {
  test('Should provide the valueBag properly to a child step and the parent next step', async () => {
    const companySteps = getCompanySteps()
    const employeeSteps = getEmployeeSteps()

    await new Caminho()
      .source(companySteps.generator)
      .pipe(companySteps.fetchStatus)
      .subFlow(employeeSteps.generator, (caminho) => caminho
        .pipe(employeeSteps.mapper)
        .pipe(employeeSteps.saver), employeeSteps.accumulator)
      .pipe(companySteps.saver)
      .run()

    assertCompanySteps(companySteps.saver.fn)
    assertEmployeeSteps(employeeSteps.saver.fn)
  })

  test('Should work fine when usign batching and concurrency', async () => {
    const companySteps = getCompanySteps()
    const employeeSteps = getEmployeeSteps()

    const finalStepCompanyFn = jest.fn().mockName('finalStepCompany').mockResolvedValue(null)
    const finalStepEmployeeFn = jest.fn().mockName('finalStepEmployee').mockResolvedValue(null)

    const finalStepCompany = { fn: finalStepCompanyFn }
    const finalStepEmployee = { fn: finalStepEmployeeFn }

    await new Caminho()
      .source({ ...companySteps.generator, maxItemsFlowing: 2 })
      .pipe(companySteps.fetchStatus)
      .subFlow({ ...employeeSteps.generator, maxItemsFlowing: 1 }, (caminho) => caminho
        .pipe({ ...employeeSteps.mapper, options: { maxConcurrency: 1 } })
        .pipe({ ...employeeSteps.saver, options: { batch: { maxSize: 10, timeoutMs: 5 } } })
        .pipe(finalStepEmployee), employeeSteps.accumulator)
      .pipe({ ...companySteps.saver, options: { batch: { maxSize: 2, timeoutMs: 10 } } })
      .pipe(finalStepCompany)
      .run()

    assertCompanySteps(finalStepCompany.fn)
    assertEmployeeSteps(finalStepEmployee.fn)
  })

  test('Should work for multiple subFlows in the same parent flow', async () => {
    const companySteps = getCompanySteps()
    const employeeSteps = getEmployeeSteps()
    const internSteps = getEmployeeSteps()

    await new Caminho()
      .source(companySteps.generator)
      .pipe(companySteps.fetchStatus)
      .subFlow(employeeSteps.generator, (caminho) => caminho
        .pipe(employeeSteps.mapper)
        .pipe(employeeSteps.saver), employeeSteps.accumulator)
      .pipe(companySteps.saver)
      .subFlow(internSteps.generator, (caminho) => caminho
        .pipe(internSteps.mapper)
        .pipe(internSteps.saver), internSteps.accumulator)
      .run()

    assertCompanySteps(companySteps.saver.fn)

    assertEmployeeSteps(employeeSteps.saver.fn)
    assertEmployeeSteps(internSteps.saver.fn, { savedEmployees: 3 })
  })

  test('Should work for multiple nested subFlows', async () => {
    const companySteps = getCompanySteps()
    const employeeSteps = getEmployeeSteps()
    const documentSteps = getDocumentSteps()
    const internSteps = getEmployeeSteps()

    await new Caminho()
      .source(companySteps.generator)
      .pipe(companySteps.fetchStatus)
      .subFlow(employeeSteps.generator, (employeeCaminho) => employeeCaminho
        .pipe(employeeSteps.mapper)
        .subFlow(documentSteps.generator, (documentCaminho) => documentCaminho
          .pipe(documentSteps.saver), documentSteps.accumulator)
        .pipe(employeeSteps.saver), employeeSteps.accumulator)
      .pipe(companySteps.saver)
      .subFlow(internSteps.generator, (caminho) => caminho
        .pipe(internSteps.mapper)
        .pipe(internSteps.saver), internSteps.accumulator)
      .run()

    assertCompanySteps(companySteps.saver.fn)

    assertEmployeeSteps(employeeSteps.saver.fn, { savedDocuments: 2 })
    assertEmployeeSteps(internSteps.saver.fn, { savedEmployees: 3 })
    assertDocumentSteps(documentSteps.saver.fn)
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
  const accumulator: Accumulator<number> = { fn: (acc: number) => acc + 1, seed: 0, provides: 'savedEmployees' }

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
  const accumulator: Accumulator<number> = { fn: (acc: number) => acc + 1, seed: 0, provides: 'savedDocuments' }

  return {
    generator,
    saver,
    accumulator,
  }
}

function assertCompanySteps(lastStepMock: jest.Mock) {
  expect(lastStepMock).toHaveBeenCalledTimes(3)
  const companyParams = lastStepMock.mock.calls.map((params) => params[0])
  expect(companyParams).toEqual(expect.arrayContaining([
    { companyId: 1, companyStatus: true, savedEmployees: 3 },
    { companyId: 2, companyStatus: false, savedEmployees: 3 },
    { companyId: 3, companyStatus: true, savedEmployees: 3 },
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
