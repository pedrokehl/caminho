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

  const saveCompanyFn = jest.fn().mockName('saveCompany').mockResolvedValue(null)
  const saveEmployeeFn = jest.fn().mockName('saveEmployee').mockResolvedValue(null)
  const companyIdGeneratorFn = getMockedGenerator(new Array(3).fill(0).map((_, index) => index + 1))
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

  expect(saveCompanyFn).toHaveBeenCalledTimes(3)
  const saveCompanyParams = saveCompanyFn.mock.calls.map((params) => params[0])
  expect(saveCompanyParams).toEqual(expect.arrayContaining([
    { companyId: 1, companyStatus: true, savedEmployees: 3 },
    { companyId: 2, companyStatus: false, savedEmployees: 3 },
    { companyId: 3, companyStatus: true, savedEmployees: 3 },
  ]))

  expect(saveEmployeeFn).toHaveBeenCalledTimes(9)
  expect(saveEmployeeFn.mock.calls.map((params) => params[0])).toEqual(expect.arrayContaining([
    mockEmployeeResult(1, true, 'Elon', 'Employed'),
    mockEmployeeResult(1, true, 'Bezos', 'Employed'),
    mockEmployeeResult(1, true, 'Cook', 'Employed'),

    mockEmployeeResult(2, false, 'Elon', 'Unemployed'),
    mockEmployeeResult(2, false, 'Bezos', 'Unemployed'),
    mockEmployeeResult(2, false, 'Cook', 'Unemployed'),

    mockEmployeeResult(3, true, 'Elon', 'Employed'),
    mockEmployeeResult(3, true, 'Bezos', 'Employed'),
    mockEmployeeResult(3, true, 'Cook', 'Employed'),
  ]))
})

function mockEmployeeResult(companyId: number, companyStatus: boolean, employeeName: string, employeeStatus: string) {
  return {
    companyId,
    companyStatus,
    employeeName,
    mappedEmployee: { companyId, employeeName, status: employeeStatus },
  }
}
