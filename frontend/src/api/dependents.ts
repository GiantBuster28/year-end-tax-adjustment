import client from './client'
import { Dependent } from '../types'

export const getDependents = async (declarationId: number): Promise<Dependent[]> => {
  const { data } = await client.get<Dependent[]>(`/declarations/${declarationId}/dependents`)
  return data
}

export const createDependent = async (
  declarationId: number,
  dependent: Omit<Dependent, 'id' | 'declaration_id'>
): Promise<Dependent> => {
  const { data } = await client.post<Dependent>(
    `/declarations/${declarationId}/dependents`,
    dependent
  )
  return data
}

export const updateDependent = async (
  declarationId: number,
  dependentId: number,
  dependent: Partial<Omit<Dependent, 'id' | 'declaration_id'>>
): Promise<Dependent> => {
  const { data } = await client.put<Dependent>(
    `/declarations/${declarationId}/dependents/${dependentId}`,
    dependent
  )
  return data
}

export const deleteDependent = async (
  declarationId: number,
  dependentId: number
): Promise<void> => {
  await client.delete(`/declarations/${declarationId}/dependents/${dependentId}`)
}
