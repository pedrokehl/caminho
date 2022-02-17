import { from, OperationType, ReduceParams, ValueBag } from '../../src'

import { getMockedGenerator, getMockedJobGenerator } from '../mocks/generator.mock'
import { getNumberedArray } from '../mocks/array.mock'
import { mockStepResult } from '../mocks/stepResult.mock'
import { sleep } from '../../src/utils/sleep'

describe('Sub-Flow', () => {
  test('Should provide the valueBag properly to a child step and the parent next step', async () => {
    const companySteps = getCompanySteps()
    const employeeSteps = getEmployeeSteps()

    await from(companySteps.generator)
      .pipe(companySteps.fetchStatus)
      .subFlow((sub) => sub(employeeSteps.generator)
        .pipe(employeeSteps.mapper)
        .pipe(employeeSteps.saver)
        .reduce(employeeSteps.accumulator))
      .pipe(companySteps.saver)
      .run()

    assertCompanySteps(companySteps.saver.fn, { savedEmployees: 3 })
    assertEmployeeSteps(employeeSteps.saver.fn)
  })

  test('Should provide the proper item to the next parent step even when accumulator is not defined', async () => {
    const companySteps = getCompanySteps()
    const employeeSteps = getEmployeeSteps()

    await from(companySteps.generator)
      .pipe(companySteps.fetchStatus)
      .subFlow((sub) => sub(employeeSteps.generator)
        .pipe(employeeSteps.mapper)
        .pipe(employeeSteps.saver))
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

    await from({ ...companySteps.generator, maxItemsFlowing: 2 })
      .pipe(companySteps.fetchStatus)
      .subFlow((sub) => sub({ ...employeeSteps.generator, maxItemsFlowing: 1 })
        .pipe({ ...employeeSteps.mapper, maxConcurrency: 1 })
        .pipe({ ...employeeSteps.saver, batch: { maxSize: 10, timeoutMs: 5 } })
        .pipe(finalStepEmployee)
        .reduce(employeeSteps.accumulator))
      .pipe({ ...companySteps.saver, batch: { maxSize: 2, timeoutMs: 10 } })
      .pipe(finalStepCompany)
      .run()

    assertCompanySteps(finalStepCompany.fn, { savedEmployees: 3 })
    assertEmployeeSteps(finalStepEmployee.fn)
  })

  test('Should work for multiple subFlows in the same parent flow', async () => {
    const companySteps = getCompanySteps()
    const employeeSteps = getEmployeeSteps()
    const internSteps = getEmployeeSteps()

    await from(companySteps.generator)
      .pipe(companySteps.fetchStatus)
      .subFlow((sub) => sub(employeeSteps.generator)
        .pipe(employeeSteps.mapper)
        .pipe(employeeSteps.saver)
        .reduce(employeeSteps.accumulator))
      .pipe(companySteps.saver)
      .subFlow((sub) => sub(employeeSteps.generator)
        .pipe(internSteps.mapper)
        .pipe(internSteps.saver)
        .reduce(internSteps.accumulator))
      .run()

    assertCompanySteps(companySteps.saver.fn, { savedEmployees: 3 })

    assertEmployeeSteps(employeeSteps.saver.fn)
    assertEmployeeSteps(internSteps.saver.fn, { savedEmployees: 3 })
  })

  test('Should work for multiple nested subFlows', async () => {
    const companySteps = getCompanySteps()
    const employeeSteps = getEmployeeSteps()
    const documentSteps = getDocumentSteps()
    const internSteps = getEmployeeSteps()

    await from(companySteps.generator)
      .pipe(companySteps.fetchStatus)
      .subFlow((employeeFrom) => employeeFrom(employeeSteps.generator)
        .pipe(employeeSteps.mapper)
        .subFlow((docFrom) => docFrom(documentSteps.generator)
          .pipe(documentSteps.saver)
          .reduce(documentSteps.accumulator))
        .pipe(employeeSteps.saver)
        .reduce(employeeSteps.accumulator))
      .pipe(companySteps.saver)
      .subFlow((employeeFrom) => employeeFrom(internSteps.generator)
        .pipe(internSteps.mapper)
        .pipe(internSteps.saver)
        .reduce(internSteps.accumulator))
      .run()

    assertCompanySteps(companySteps.saver.fn, { savedEmployees: 3 })

    assertEmployeeSteps(employeeSteps.saver.fn, { savedDocuments: 2 })
    assertEmployeeSteps(internSteps.saver.fn, { savedEmployees: 3 })
    assertDocumentSteps(documentSteps.saver.fn)
  })

  test('Should share backpressure between parentEvents, but have a standalone "finish" state', async () => {
    const onEachStepMock = jest.fn().mockName('onEachStepLog')
    const fetch = jest.fn().mockName('fetch').mockImplementation(() => sleep(5))
    const save = jest.fn().mockName('save').mockImplementation(() => sleep(2))

    const subFetch = jest.fn().mockName('subFetch').mockImplementation(() => sleep(5))
    const subSave = jest.fn().mockName('subSave').mockImplementation(() => sleep(2))
    const subFlowAccumulator = { fn: (acc: number) => acc + 1, seed: 0, provides: 'sum' }

    const generator = { fn: getMockedJobGenerator(3), provides: 'job', name: 'jobGenerator', maxItemsFlowing: 1 }
    const subFlowGenerator = {
      fn: getMockedJobGenerator(2),
      provides: 'subJob',
      maxItemsFlowing: 1,
      name: 'subJobGenerator',
    }

    await from(generator, { onEachStep: onEachStepMock })
      .pipe({ fn: fetch, name: 'fetch' })
      .subFlow((sub) => sub(subFlowGenerator)
        .pipe({ fn: subFetch, name: 'subFetch' })
        .pipe({ fn: subSave, name: 'subSave' })
        .reduce(subFlowAccumulator))
      .pipe({ fn: save, name: 'save' })
      .run()

    const subFlowSteps = [
      [mockStepResult({ name: 'subJobGenerator', type: OperationType.GENERATE })],
      [mockStepResult({ name: 'subFetch', type: OperationType.PIPE })],
      [mockStepResult({ name: 'subSave', type: OperationType.PIPE })],
    ]

    const eachParentSteps = [
      [mockStepResult({ name: 'jobGenerator', type: OperationType.GENERATE })],
      [mockStepResult({ name: 'fetch', type: OperationType.PIPE })],
      ...subFlowSteps,
      ...subFlowSteps,
      [mockStepResult({ name: 'save', type: OperationType.PIPE })],
    ]

    expect(onEachStepMock.mock.calls).toEqual([
      ...eachParentSteps,
      ...eachParentSteps,
      ...eachParentSteps,
    ])
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
  const accumulator: ReduceParams<number> = { fn: (acc: number) => acc + 1, seed: 0, provides: 'savedEmployees' }

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
  const accumulator: ReduceParams<number> = { fn: (acc: number) => acc + 1, seed: 0, provides: 'savedDocuments' }

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
