import React, { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getHousingDeduction, saveHousingDeduction, updateHousingDeduction } from '../../api/housing'
import { useDeclaration } from '../../hooks/useDeclaration'
import { WareikiInput } from '../../components/WareikiInput'
import { LoadingSpinner } from '../../components/LoadingSpinner'

const schema = z.object({
  has_housing: z.boolean(),
  residence_start_date: z.string().optional(),
  deduction_type: z.string().optional(),
  loan_balance_1: z.coerce.number().min(0).optional(),
  loan_balance_2: z.coerce.number().min(0).optional(),
})

type FormData = z.infer<typeof schema>

const calculateDeduction = (balance1: number, balance2?: number): number => {
  const total = balance1 + (balance2 || 0)
  const base = Math.min(total, 50000000) // 5000万円上限
  return Math.floor(base * 0.007) // 0.7%
}

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

export const HousingForm: React.FC = () => {
  const { declaration, isLoading: declLoading } = useDeclaration()
  const queryClient = useQueryClient()
  const [saveSuccess, setSaveSuccess] = useState(false)

  const { data: existing, isLoading } = useQuery({
    queryKey: ['housing', declaration?.id],
    queryFn: () => getHousingDeduction(declaration!.id),
    enabled: !!declaration?.id,
  })

  const { register, handleSubmit, watch, control, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { has_housing: false, loan_balance_1: 0, loan_balance_2: 0 },
  })

  useEffect(() => {
    if (existing) {
      reset({
        has_housing: true,
        residence_start_date: existing.residence_start_date,
        deduction_type: existing.deduction_type,
        loan_balance_1: existing.loan_balance_1,
        loan_balance_2: existing.loan_balance_2,
      })
    }
  }, [existing, reset])

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => {
      if (!data.has_housing) return Promise.resolve(null)
      const payload = {
        residence_start_date: data.residence_start_date || '',
        deduction_type: data.deduction_type || 'standard',
        loan_balance_1: data.loan_balance_1 || 0,
        loan_balance_2: data.loan_balance_2,
      }
      if (existing?.id) {
        return updateHousingDeduction(declaration!.id, payload)
      }
      return saveHousingDeduction(declaration!.id, payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['housing', declaration?.id] })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    },
  })

  const hasHousing = watch('has_housing')
  const loan1 = watch('loan_balance_1') || 0
  const loan2 = watch('loan_balance_2') || 0
  const deductionPreview = hasHousing ? calculateDeduction(Number(loan1), Number(loan2)) : 0

  if (declLoading || isLoading) return <LoadingSpinner fullPage />

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a3a5c', marginBottom: '1.5rem' }}>
        住宅ローン控除申告書（SCR-013）
      </h2>

      <form onSubmit={handleSubmit((d) => saveMutation.mutateAsync(d))}>
        <div style={cardStyle}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a3a5c', marginBottom: '1rem' }}>
            住宅ローン控除の有無
          </h3>

          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: '1.5rem' }}>
            <input
              type="checkbox"
              {...register('has_housing')}
              style={{ width: 18, height: 18 }}
            />
            <span style={{ fontSize: 15, fontWeight: 500, color: '#374151' }}>
              住宅ローン控除の適用を受ける
            </span>
          </label>

          {hasHousing && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <Controller
                name="residence_start_date"
                control={control}
                render={({ field }) => (
                  <WareikiInput
                    value={field.value || ''}
                    onChange={field.onChange}
                    label="居住開始年月日"
                    required
                  />
                )}
              />

              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>
                  控除の種類
                </label>
                <select {...register('deduction_type')} style={inputStyle}>
                  <option value="standard">一般住宅（標準）</option>
                  <option value="long_life">長期優良住宅・低炭素住宅</option>
                  <option value="zeh">ZEH水準省エネ住宅</option>
                  <option value="energy_saving">省エネ基準適合住宅</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>
                    年末ローン残高①（円） <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    {...register('loan_balance_1')}
                    type="number"
                    min="0"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>
                    年末ローン残高②（円）
                    <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 4 }}>（2件目）</span>
                  </label>
                  <input
                    {...register('loan_balance_2')}
                    type="number"
                    min="0"
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Deduction Preview */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                  borderRadius: 10,
                  padding: '1.25rem',
                  color: 'white',
                }}
              >
                <p style={{ fontSize: 13, opacity: 0.85, margin: 0 }}>控除額（見込み・年間）</p>
                <p style={{ fontSize: 28, fontWeight: 700, margin: '4px 0 0' }}>
                  ¥{deductionPreview.toLocaleString()}
                </p>
                <p style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                  算出根拠: ローン残高合計 × 0.7%（上限5,000万円）
                </p>
              </div>
            </div>
          )}
        </div>

        {saveSuccess && (
          <div
            style={{
              backgroundColor: '#d1fae5',
              border: '1px solid #6ee7b7',
              borderRadius: 8,
              padding: '12px 16px',
              color: '#065f46',
              fontSize: 14,
              marginBottom: '1rem',
            }}
          >
            ✓ 保存しました
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            disabled={saveMutation.isPending || !declaration}
            style={{
              backgroundColor: saveMutation.isPending ? '#93c5fd' : '#1a56db',
              color: 'white',
              padding: '10px 28px',
              border: 'none',
              borderRadius: 8,
              cursor: declaration ? 'pointer' : 'not-allowed',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {saveMutation.isPending ? '保存中...' : '保存する'}
          </button>
        </div>
      </form>
    </div>
  )
}
