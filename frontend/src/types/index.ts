export type DisabilityType = 'none' | 'general' | 'special' | 'cohabitation_special'
export type DeclarationStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'calculated'
export type InsuranceType = 'life_new' | 'life_old' | 'pension_new' | 'pension_old' | 'earthquake'

export interface User {
  id: number
  employee_code: string
  name: string
  email: string
  is_admin: boolean
  department: string
}

export interface Declaration {
  id: number
  employee_id: number
  fiscal_year: number
  status: DeclarationStatus
  submitted_at?: string
  approved_at?: string
  created_at: string
  updated_at: string
}

export interface Dependent {
  id: number
  declaration_id: number
  relation_type: string
  last_name: string
  first_name: string
  birth_date: string
  annual_income: number
  disability_type: DisabilityType
  disability_certificate_type?: string
  disability_certificate_date?: string
  disability_description?: string
  is_living_together: boolean
}

export interface InsuranceDeduction {
  id: number
  declaration_id: number
  insurance_type: InsuranceType
  insurance_company: string
  policy_name: string
  insured_person: string
  payment_amount: number
  deduction_amount: number
}

export interface HousingDeduction {
  id?: number
  declaration_id: number
  residence_start_date: string
  deduction_type: string
  loan_balance_1: number
  loan_balance_2?: number
  deduction_amount: number
}

export interface Attachment {
  id: number
  declaration_id: number
  file_name: string
  file_type: string
  file_size: number
  uploaded_at: string
}

export interface WithholdingSlip {
  id: number
  employee_id: number
  fiscal_year: number
  gross_salary: number
  tax_withheld: number
  year_end_adjustment: number
  created_at: string
}

export interface CalculationResult {
  id: number
  declaration_id: number
  employee_name: string
  employee_code: string
  gross_salary: number
  total_deduction: number
  taxable_income: number
  calculated_tax: number
  withheld_tax: number
  adjustment_amount: number
  status: string
}

export interface DashboardStats {
  total_employees: number
  submitted_count: number
  under_review_count: number
  approved_count: number
  calculated_count: number
  submission_rate: number
}

export interface AuthResponse {
  token: string
  user: User
}

export interface ApiError {
  message: string
  errors?: Record<string, string[]>
}
