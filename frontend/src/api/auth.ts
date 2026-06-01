import client from './client'
import { AuthResponse } from '../types'

export interface LoginPayload {
  employee_code: string
  password: string
  role: 'employee' | 'admin'
}

export const login = async (payload: LoginPayload): Promise<AuthResponse> => {
  const { data } = await client.post<AuthResponse>('/auth/login', payload)
  return data
}

export const logout = async (): Promise<void> => {
  await client.post('/auth/logout')
}

export const getMe = async () => {
  const { data } = await client.get('/auth/me')
  return data
}
