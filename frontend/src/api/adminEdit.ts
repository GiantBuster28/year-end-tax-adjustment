import client from './client'

export interface DependentUpsert {
  id?: number
  relation_type: string
  last_name: string
  first_name: string
  birth_date: string
  annual_income: number
  disability_type: string
  is_living_together: boolean
}

export interface InsuranceUpsert {
  id?: number
  insurance_type: string
  insurance_company: string
  policy_name: string
  insured_person: string
  payment_amount: number
  deduction_amount: number
}

export interface HousingUpdate {
  residence_start_date: string
  deduction_type: string
  loan_balance_1: number
  loan_balance_2: number
  deduction_amount: number
}

export interface SalaryUpdate {
  total_salary: number
  social_insurance_deduction: number
  withheld_tax_ytd: number
}

export interface ResultOverride {
  final_tax: number
  withheld_tax: number
  refund_or_collection: number
}

export interface AdminDeclarationDetail {
  id: number
  employee_id: number
  fiscal_year: number
  status: string
  total_salary?: string
  social_insurance_deduction?: string
  withheld_tax_ytd?: string
  submitted_at?: string
  approved_at?: string
  employee_last_name?: string
  employee_first_name?: string
  employee_code?: string
  department_name?: string
  dependents: Record<string, unknown>[]
  insurance_deductions: Record<string, unknown>[]
  housing_deduction?: Record<string, unknown>
  result?: Record<string, unknown>
}

export const getAdminDeclarationDetail = async (id: number): Promise<AdminDeclarationDetail> => {
  const { data } = await client.get(`/admin/declarations/${id}/detail`)
  return data
}

export const updateDependents = async (declarationId: number, dependents: DependentUpsert[]) => {
  const { data } = await client.put(`/admin/declarations/${declarationId}/dependents`, dependents)
  return data
}

export const updateInsurance = async (declarationId: number, insurance: InsuranceUpsert[]) => {
  const { data } = await client.put(`/admin/declarations/${declarationId}/insurance`, insurance)
  return data
}

export const updateHousing = async (declarationId: number, housing: HousingUpdate) => {
  const { data } = await client.put(`/admin/declarations/${declarationId}/housing`, housing)
  return data
}

export const updateSalary = async (declarationId: number, salary: SalaryUpdate) => {
  const { data } = await client.post(`/admin/declarations/${declarationId}/salary`, salary)
  return data
}

export const overrideResult = async (resultId: number, override: ResultOverride) => {
  const { data } = await client.put(`/admin/results/${resultId}/override`, override)
  return data
}
