import client from './client'
import { HousingDeduction } from '../types'

export const getHousingDeduction = async (declarationId: number): Promise<HousingDeduction | null> => {
  try {
    const { data } = await client.get<HousingDeduction>(
      `/declarations/${declarationId}/housing_deduction`
    )
    return data
  } catch {
    return null
  }
}

export const saveHousingDeduction = async (
  declarationId: number,
  deduction: Omit<HousingDeduction, 'id' | 'declaration_id' | 'deduction_amount'>
): Promise<HousingDeduction> => {
  const { data } = await client.post<HousingDeduction>(
    `/declarations/${declarationId}/housing_deduction`,
    deduction
  )
  return data
}

export const updateHousingDeduction = async (
  declarationId: number,
  deduction: Partial<Omit<HousingDeduction, 'declaration_id'>>
): Promise<HousingDeduction> => {
  const { data } = await client.put<HousingDeduction>(
    `/declarations/${declarationId}/housing_deduction`,
    deduction
  )
  return data
}
