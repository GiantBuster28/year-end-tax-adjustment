import client from './client'
import { DashboardStats, CalculationResult, WithholdingSlip } from '../types'

export const getDashboardStats = async (fiscal_year: number): Promise<DashboardStats> => {
  const { data } = await client.get<DashboardStats>('/admin/dashboard', {
    params: { fiscal_year },
  })
  return data
}

export const sendReminderEmails = async (fiscal_year: number): Promise<{ sent_count: number }> => {
  const { data } = await client.post('/admin/send_reminders', { fiscal_year })
  return data
}

export const runCalculation = async (fiscal_year: number): Promise<{ job_id: string }> => {
  const { data } = await client.post('/admin/calculation/run', { fiscal_year })
  return data
}

export const getCalculationStatus = async (
  job_id: string
): Promise<{ status: string; progress: number; total: number; completed: number }> => {
  const { data } = await client.get(`/admin/calculation/status/${job_id}`)
  return data
}

export const getCalculationResults = async (fiscal_year: number): Promise<CalculationResult[]> => {
  const { data } = await client.get<CalculationResult[]>('/admin/calculation/results', {
    params: { fiscal_year },
  })
  return data
}

export const finalizeResults = async (fiscal_year: number): Promise<void> => {
  await client.post('/admin/calculation/finalize', { fiscal_year })
}

export const getWithholdingSlips = async (fiscal_year: number): Promise<WithholdingSlip[]> => {
  const { data } = await client.get<WithholdingSlip[]>('/admin/withholding_slips', {
    params: { fiscal_year },
  })
  return data
}

export const downloadReport = async (
  fiscal_year: number,
  report_type: string
): Promise<Blob> => {
  const { data } = await client.get('/admin/reports/download', {
    params: { fiscal_year, report_type },
    responseType: 'blob',
  })
  return data
}

export const getMyWithholdingSlips = async (): Promise<WithholdingSlip[]> => {
  const { data } = await client.get<WithholdingSlip[]>('/withholding_slips/me')
  return data
}
