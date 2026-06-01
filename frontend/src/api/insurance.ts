import client from './client'
import { InsuranceDeduction } from '../types'

export const getInsuranceDeductions = async (declarationId: number): Promise<InsuranceDeduction[]> => {
  const { data } = await client.get<InsuranceDeduction[]>(
    `/declarations/${declarationId}/insurance_deductions`
  )
  return data
}

export const createInsuranceDeduction = async (
  declarationId: number,
  deduction: Omit<InsuranceDeduction, 'id' | 'declaration_id' | 'deduction_amount'>
): Promise<InsuranceDeduction> => {
  const { data } = await client.post<InsuranceDeduction>(
    `/declarations/${declarationId}/insurance_deductions`,
    deduction
  )
  return data
}

export const updateInsuranceDeduction = async (
  declarationId: number,
  deductionId: number,
  deduction: Partial<Omit<InsuranceDeduction, 'id' | 'declaration_id'>>
): Promise<InsuranceDeduction> => {
  const { data } = await client.put<InsuranceDeduction>(
    `/declarations/${declarationId}/insurance_deductions/${deductionId}`,
    deduction
  )
  return data
}

export const deleteInsuranceDeduction = async (
  declarationId: number,
  deductionId: number
): Promise<void> => {
  await client.delete(`/declarations/${declarationId}/insurance_deductions/${deductionId}`)
}
