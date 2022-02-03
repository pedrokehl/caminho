import { Accumulator, Caminho } from '../src/caminho'
import { ValueBag } from '../src/types'
import { getMockedGenerator } from './mocks/generator.mock'

// TODO: write tests for other scenarios (concurrency, backpressure, parallelization, etc)
test('Should provide the valueBag properly to a subFlow step', async () => {
  const fetchCompanyStatusFn = jest.fn()
    .mockName('fetchCompanyStatus')
    .mockImplementation((valueBag: ValueBag) => valueBag.companyId % 2 !== 0)

  function mapEmployeeFn(valueBag: ValueBag) {
    return {
      companyId: valueBag.companyId,
      employeeName: valueBag.employeeName,
      status: valueBag.companyStatus ? 'Employed' : 'Unemployed',
    }
  }

  const companyItems = 3

  const saveCompanyFn = jest.fn().mockName('saveCompany').mockResolvedValue(null)
  const saveEmployeeFn = jest.fn().mockName('saveEmployee').mockResolvedValue(null)
  const companyIdGeneratorFn = getMockedGenerator(new Array(companyItems).fill(0).map((_, index) => index + 1))
  const employeeGeneratorFn = getMockedGenerator(['Elon', 'Bezos', 'Cook'])

  // Steps
  const companyIdGenerator = { fn: companyIdGeneratorFn, provides: 'companyId' }
  const fetchCompanyStatus = { fn: fetchCompanyStatusFn, provides: 'companyStatus' }
  const saveCompany = { fn: saveCompanyFn }

  const employeeGenerator = { fn: employeeGeneratorFn, provides: 'employeeName' }
  const mapEmployee = { fn: mapEmployeeFn, provides: 'mappedEmployee' }
  const saveEmployee = { fn: saveEmployeeFn }
  const employeeAcumulator: Accumulator<number> = { fn: (acc: number) => acc + 1, seed: 0, provides: 'savedEmployees' }

  await new Caminho()
    .source(companyIdGenerator)
    .pipe(fetchCompanyStatus)
    .subFlow(employeeGenerator, (caminho) => caminho
      .pipe(mapEmployee)
      .pipe(saveEmployee), employeeAcumulator)
    .pipe(saveCompany)
    .run()

  expect(saveCompanyFn).toHaveBeenCalledTimes(companyItems)
  const saveCompanyParams = saveCompanyFn.mock.calls.map((params) => params[0])
  expect(saveCompanyParams).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ companyId: 1, companyStatus: true, savedEmployees: 3 }),
      expect.objectContaining({ companyId: 2, companyStatus: false, savedEmployees: 3 }),
      expect.objectContaining({ companyId: 3, companyStatus: true, savedEmployees: 3 }),
    ]),
  )

  expect(saveEmployeeFn).toHaveBeenCalledTimes(companyItems * 3)
  const saveEmployeeParams = saveEmployeeFn.mock.calls.map((params) => params[0])
  expect(saveEmployeeParams).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ mappedEmployee: { companyId: 1, employeeName: 'Elon', status: 'Employed' } }),
      expect.objectContaining({ mappedEmployee: { companyId: 1, employeeName: 'Bezos', status: 'Employed' } }),
      expect.objectContaining({ mappedEmployee: { companyId: 1, employeeName: 'Cook', status: 'Employed' } }),

      expect.objectContaining({ mappedEmployee: { companyId: 2, employeeName: 'Elon', status: 'Unemployed' } }),
      expect.objectContaining({ mappedEmployee: { companyId: 2, employeeName: 'Bezos', status: 'Unemployed' } }),
      expect.objectContaining({ mappedEmployee: { companyId: 2, employeeName: 'Cook', status: 'Unemployed' } }),

      expect.objectContaining({ mappedEmployee: { companyId: 3, employeeName: 'Elon', status: 'Employed' } }),
      expect.objectContaining({ mappedEmployee: { companyId: 3, employeeName: 'Bezos', status: 'Employed' } }),
      expect.objectContaining({ mappedEmployee: { companyId: 3, employeeName: 'Cook', status: 'Employed' } }),
    ]),
  )
})
