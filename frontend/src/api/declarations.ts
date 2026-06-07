import client from './client'
import { Declaration } from '../types'

export const getDeclarations = async (params?: {
  status?: string
  fiscal_year?: number
  page?: number
  per_page?: number
}) => {
  const { data } = await client.get('/declarations', { params })
  return data
}

export const getDeclaration = async (id: number): Promise<Declaration> => {
  const { data } = await client.get<Declaration>(`/declarations/${id}`)
  return data
}

export const getMyDeclaration = async (fiscal_year: number): Promise<Declaration> => {
  const { data } = await client.get<Declaration>('/declarations/me', { params: { fiscal_year } })
  return data
}

export const createDeclaration = async (fiscal_year: number): Promise<Declaration> => {
  const { data } = await client.post<Declaration>('/declarations', { fiscal_year })
  return data
}

export const submitDeclaration = async (id: number): Promise<Declaration> => {
  const { data } = await client.post<Declaration>(`/declarations/${id}/submit`)
  return data
}

export const approveDeclaration = async (id: number): Promise<Declaration> => {
  const { data } = await client.post<Declaration>(`/declarations/${id}/approve`)
  return data
}

export const rejectDeclaration = async (id: number, reason: string): Promise<Declaration> => {
  const { data } = await client.post<Declaration>(`/declarations/${id}/reject`, { reason })
  return data
}
