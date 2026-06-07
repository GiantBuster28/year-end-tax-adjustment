import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getInsuranceDeductions, createInsuranceDeduction, deleteInsuranceDeduction } from '../../api/insurance'
import { useDeclaration } from '../../hooks/useDeclaration'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { InsuranceType } from '../../types'

const insuranceTypeLabels: Record<InsuranceType, string> = {
  life_new: '生命保険（新制度）',
  life_old: '生命保険（旧制度）',
  pension_new: '個人年金（新制度）',
  pension_old: '個人年金（旧制度）',
  earthquake: '地震保険',
}

const calculateDeduction = (type: InsuranceType, amount: number): number => {
  if (type === 'earthquake') {
    if (amount <= 50000) return amount
    return 50000
  }
  // 新制度計算（生命・年金共通）
  if (type === 'life_new' || type === 'pension_new') {
    if (amount <= 20000) return amount
    if (amount <= 40000) return Math.floor(amount / 2) + 10000
    if (amount <= 80000) return Math.floor(amount / 4) + 20000
    return 40000
  }
  // 旧制度
  if (amount <= 25000) return amount
  if (amount <= 50000) return Math.floor(amount / 2) + 12500
  if (amount <= 100000) return Math.floor(amount / 4) + 25000
  return 50000
}

const schema = z.object({
  insurance_type: z.enum(['life_new', 'life_old', 'pension_new', 'pension_old', 'earthquake']),
  insurance_company: z.string().min(1, '保険会社名を入力してください'),
  policy_name: z.string().min(1, '保険名称を入力してください'),
  insured_person: z.string().min(1, '被保険者名を入力してください'),
  payment_amount: z.coerce.number().min(1, '支払保険料を入力してください'),
})

type FormData = z.infer<typeof schema>

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: 14,
  width: '100%',
}

const cardStyle: React.CSSProperties = {
  backgroundColor: 'white',
  borderRadius: 12,
  padding: '1.5rem',
  boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
  marginBottom: '1.5rem',
}

export const InsuranceForm: React.FC = () => {
  const { declaration, isLoading: declLoading } = useDeclaration()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [previewAmount, setPreviewAmount] = useState(0)
  const [previewType, setPreviewType] = useState<InsuranceType>('life_new')

  const { data: deductions = [], isLoading } = useQuery({
    queryKey: ['insurance', declaration?.id],
    queryFn: () => getInsuranceDeductions(declaration!.id),
    enabled: !!declaration?.id,
  })

  const createMutation = useMutation({
    mutationFn: (data: FormData) =>
      createInsuranceDeduction(declaration!.id, {
        ...data,
        insurance_type: data.insurance_type as InsuranceType,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insurance', declaration?.id] })
      setShowForm(false)
      reset()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteInsuranceDeduction(declaration!.id, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['insurance', declaration?.id] }),
  })

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { insurance_type: 'life_new', payment_amount: 0 },
  })

  const watchedType = watch('insurance_type') as InsuranceType
  const watchedAmount = watch('payment_amount')
  const previewDeduction = calculateDeduction(watchedType, Number(watchedAmount))

  // Group deductions by type
  const groups: Record<string, typeof deductions> = {}
  deductions.forEach((d) => {
    if (!groups[d.insurance_type]) groups[d.insurance_type] = []
    groups[d.insurance_type].push(d)
  })

  const totalDeduction = deductions.reduce((sum, d) => sum + d.deduction_amount, 0)

  if (declLoading) return <LoadingSpinner fullPage />

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a3a5c', marginBottom: '1.5rem' }}>
        保険料控除申告書（SCR-012）
      </h2>

      {/* Summary Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0d9488, #0f766e)',
          borderRadius: 12,
          padding: '1.25rem 1.5rem',
          color: 'white',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <p style={{ fontSize: 13, opacity: 0.85, margin: 0 }}>合計控除額（見込み）</p>
          <p style={{ fontSize: 28, fontWeight: 700, margin: '4px 0 0' }}>
            ¥{totalDeduction.toLocaleString()}
          </p>
        </div>
        <span style={{ fontSize: 36, opacity: 0.5 }}>🛡️</span>
      </div>

      {/* Add Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button
          onClick={() => setShowForm(!showForm)}
          disabled={!declaration}
          style={{
            backgroundColor: '#1a56db',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            padding: '8px 20px',
            cursor: declaration ? 'pointer' : 'not-allowed',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          ＋ 保険料を追加
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div style={cardStyle}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a3a5c', marginBottom: '1rem' }}>
            保険料入力
          </h3>
          <form onSubmit={handleSubmit((d) => createMutation.mutateAsync(d))}
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>
                  保険種別 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select {...register('insurance_type')} style={inputStyle}>
                  {Object.entries(insuranceTypeLabels).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>
                  支払保険料（円） <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input {...register('payment_amount')} type="number" min="0" style={inputStyle} />
                {errors.payment_amount && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 2 }}>{errors.payment_amount.message}</p>}
              </div>
            </div>

            {Number(watchedAmount) > 0 && (
              <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: '#065f46' }}>
                控除額（自動計算）: <strong>¥{previewDeduction.toLocaleString()}</strong>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>
                  保険会社名 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input {...register('insurance_company')} style={inputStyle} />
                {errors.insurance_company && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 2 }}>{errors.insurance_company.message}</p>}
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>
                  保険名称 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input {...register('policy_name')} style={inputStyle} />
                {errors.policy_name && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 2 }}>{errors.policy_name.message}</p>}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>
                被保険者名 <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input {...register('insured_person')} style={inputStyle} />
              {errors.insured_person && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 2 }}>{errors.insured_person.message}</p>}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => { setShowForm(false); reset() }}
                style={{ padding: '8px 20px', border: '1px solid #d1d5db', borderRadius: 6, background: 'white', cursor: 'pointer', fontSize: 14 }}>
                キャンセル
              </button>
              <button type="submit" disabled={createMutation.isPending}
                style={{ padding: '8px 20px', backgroundColor: '#1a56db', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                {createMutation.isPending ? '保存中...' : '保存'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Deductions List */}
      {isLoading ? (
        <LoadingSpinner size="small" />
      ) : Object.keys(groups).length === 0 ? (
        <div style={cardStyle}>
          <p style={{ color: '#9ca3af', textAlign: 'center', padding: '1.5rem', fontSize: 14 }}>
            保険料が登録されていません
          </p>
        </div>
      ) : (
        Object.entries(groups).map(([type, items]) => (
          <div key={type} style={cardStyle}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a3a5c', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{insuranceTypeLabels[type as InsuranceType]}</span>
              <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 400 }}>
                控除額: ¥{items.reduce((s, i) => s + i.deduction_amount, 0).toLocaleString()}
              </span>
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  {['保険会社', '保険名称', '被保険者', '支払保険料', '控除額', ''].map((h) => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((d) => (
                  <tr key={d.id}>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>{d.insurance_company}</td>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>{d.policy_name}</td>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>{d.insured_person}</td>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>¥{d.payment_amount.toLocaleString()}</td>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', color: '#059669', fontWeight: 600 }}>¥{d.deduction_amount.toLocaleString()}</td>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>
                      <button
                        onClick={() => deleteMutation.mutateAsync(d.id)}
                        style={{ padding: '3px 8px', border: '1px solid #fca5a5', borderRadius: 4, cursor: 'pointer', fontSize: 11, backgroundColor: '#fee2e2', color: '#991b1b' }}
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  )
}
