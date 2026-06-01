import React, { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDependents, createDependent, updateDependent, deleteDependent } from '../../api/dependents'
import { useDeclaration } from '../../hooks/useDeclaration'
import { WareikiInput } from '../../components/WareikiInput'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { Dependent, DisabilityType } from '../../types'

const FISCAL_YEAR = 2026

const classifyDependent = (birthDate: string, isLivingTogether: boolean): string => {
  if (!birthDate) return ''
  const date = new Date(birthDate)
  const dec31 = new Date(FISCAL_YEAR, 11, 31)
  let age = dec31.getFullYear() - date.getFullYear()
  if (dec31 < new Date(dec31.getFullYear(), date.getMonth(), date.getDate())) age--

  if (age <= 15) return '年少扶養（控除対象外）'
  if (age >= 19 && age <= 22) return '特定扶養 63万円'
  if (age >= 70 && isLivingTogether) return '同居老親等 58万円'
  if (age >= 70) return '老人扶養 48万円'
  return '一般扶養 38万円'
}

const disabilityLabels: Record<DisabilityType, string> = {
  none: '該当なし',
  general: '一般障害者',
  special: '特別障害者',
  cohabitation_special: '同居特別障害者',
}

const dependentSchema = z.object({
  relation_type: z.string().min(1, '続柄を入力してください'),
  last_name: z.string().min(1, '姓を入力してください'),
  first_name: z.string().min(1, '名を入力してください'),
  birth_date: z.string().min(1, '生年月日を入力してください'),
  annual_income: z.coerce.number().min(0),
  disability_type: z.enum(['none', 'general', 'special', 'cohabitation_special']),
  disability_certificate_type: z.string().optional(),
  disability_certificate_date: z.string().optional(),
  disability_description: z.string().optional(),
  is_living_together: z.boolean(),
})

type DependentFormData = z.infer<typeof dependentSchema>

const selfSchema = z.object({
  birth_date: z.string().min(1, '生年月日を入力してください'),
  disability_type: z.enum(['none', 'general', 'special', 'cohabitation_special']),
  disability_certificate_type: z.string().optional(),
  disability_certificate_date: z.string().optional(),
  disability_description: z.string().optional(),
})

type SelfFormData = z.infer<typeof selfSchema>

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

const DependentModal: React.FC<{
  onClose: () => void
  onSave: (data: DependentFormData) => void
  initial?: Dependent
}> = ({ onClose, onSave, initial }) => {
  const { register, handleSubmit, watch, control, formState: { errors } } = useForm<DependentFormData>({
    resolver: zodResolver(dependentSchema),
    defaultValues: initial
      ? {
          relation_type: initial.relation_type,
          last_name: initial.last_name,
          first_name: initial.first_name,
          birth_date: initial.birth_date,
          annual_income: initial.annual_income,
          disability_type: initial.disability_type,
          disability_certificate_type: initial.disability_certificate_type,
          disability_certificate_date: initial.disability_certificate_date,
          disability_description: initial.disability_description,
          is_living_together: initial.is_living_together,
        }
      : { disability_type: 'none', is_living_together: true, annual_income: 0 },
  })

  const birthDate = watch('birth_date')
  const isLivingTogether = watch('is_living_together')
  const disabilityType = watch('disability_type')
  const classification = classifyDependent(birthDate, isLivingTogether)

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: 12,
          padding: '2rem',
          width: '90%',
          maxWidth: 560,
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1a3a5c', marginBottom: '1.5rem' }}>
          {initial ? '扶養親族を編集' : '扶養親族を追加'}
        </h3>

        <form onSubmit={handleSubmit(onSave)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>
                続柄 <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input {...register('relation_type')} placeholder="配偶者・子・父・母 等" style={inputStyle} />
              {errors.relation_type && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 2 }}>{errors.relation_type.message}</p>}
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>
                年間所得（万円）
              </label>
              <input {...register('annual_income')} type="number" min="0" style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>
                姓 <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input {...register('last_name')} style={inputStyle} />
              {errors.last_name && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 2 }}>{errors.last_name.message}</p>}
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>
                名 <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input {...register('first_name')} style={inputStyle} />
              {errors.first_name && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 2 }}>{errors.first_name.message}</p>}
            </div>
          </div>

          <Controller
            name="birth_date"
            control={control}
            render={({ field }) => (
              <WareikiInput
                value={field.value || ''}
                onChange={field.onChange}
                label="生年月日"
                required
                error={errors.birth_date?.message}
              />
            )}
          />

          {classification && (
            <div
              style={{
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 6,
                padding: '8px 12px',
                fontSize: 13,
                color: '#1d4ed8',
                fontWeight: 600,
              }}
            >
              扶養区分: {classification}
            </div>
          )}

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" {...register('is_living_together')} />
            <span style={{ fontSize: 14 }}>同居している</span>
          </label>

          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>
              障害者区分
            </label>
            <select {...register('disability_type')} style={inputStyle}>
              {Object.entries(disabilityLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {disabilityType !== 'none' && (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>
                  手帳の種類
                </label>
                <input {...register('disability_certificate_type')} placeholder="身体障害者手帳・療育手帳 等" style={inputStyle} />
              </div>
              <Controller
                name="disability_certificate_date"
                control={control}
                render={({ field }) => (
                  <WareikiInput
                    value={field.value || ''}
                    onChange={field.onChange}
                    label="交付年月日"
                  />
                )}
              />
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>
                  障害の内容
                </label>
                <textarea {...register('disability_description')} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 20px',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                background: 'white',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              キャンセル
            </button>
            <button
              type="submit"
              style={{
                padding: '8px 20px',
                backgroundColor: '#1a56db',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export const DependentForm: React.FC = () => {
  const { declaration, isLoading: declLoading } = useDeclaration()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<Dependent | undefined>()
  const [selfDisabilityType, setSelfDisabilityType] = useState<DisabilityType>('none')

  const {
    register: selfRegister,
    watch: selfWatch,
    control: selfControl,
    handleSubmit: selfHandleSubmit,
    formState: { errors: selfErrors },
  } = useForm<SelfFormData>({
    resolver: zodResolver(selfSchema),
    defaultValues: { disability_type: 'none' },
  })

  const selfDisability = selfWatch('disability_type')

  const { data: dependents = [], isLoading } = useQuery({
    queryKey: ['dependents', declaration?.id],
    queryFn: () => getDependents(declaration!.id),
    enabled: !!declaration?.id,
  })

  const createMutation = useMutation({
    mutationFn: (data: Omit<Dependent, 'id' | 'declaration_id'>) =>
      createDependent(declaration!.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dependents', declaration?.id] }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Omit<Dependent, 'id' | 'declaration_id'>> }) =>
      updateDependent(declaration!.id, id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dependents', declaration?.id] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteDependent(declaration!.id, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dependents', declaration?.id] }),
  })

  const handleSave = async (data: DependentFormData) => {
    if (editTarget) {
      await updateMutation.mutateAsync({ id: editTarget.id, data })
    } else {
      await createMutation.mutateAsync(data as Omit<Dependent, 'id' | 'declaration_id'>)
    }
    setShowModal(false)
    setEditTarget(undefined)
  }

  const handleEdit = (dep: Dependent) => {
    setEditTarget(dep)
    setShowModal(true)
  }

  const handleDelete = async (id: number) => {
    if (confirm('この扶養親族を削除しますか？')) {
      await deleteMutation.mutateAsync(id)
    }
  }

  if (declLoading) return <LoadingSpinner fullPage />

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a3a5c', marginBottom: '1.5rem' }}>
        扶養控除等申告書（SCR-011）
      </h2>

      {/* 本人情報 */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a3a5c', marginBottom: '1rem' }}>
          本人情報
        </h3>
        <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Controller
            name="birth_date"
            control={selfControl}
            render={({ field }) => (
              <WareikiInput
                value={field.value || ''}
                onChange={field.onChange}
                label="生年月日"
                required
                error={selfErrors.birth_date?.message}
              />
            )}
          />
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>
              障害者区分
            </label>
            <select
              {...selfRegister('disability_type')}
              onChange={(e) => setSelfDisabilityType(e.target.value as DisabilityType)}
              style={inputStyle}
            >
              {Object.entries(disabilityLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {selfDisability !== 'none' && (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>
                  手帳の種類
                </label>
                <input {...selfRegister('disability_certificate_type')} style={inputStyle} />
              </div>
              <Controller
                name="disability_certificate_date"
                control={selfControl}
                render={({ field }) => (
                  <WareikiInput
                    value={field.value || ''}
                    onChange={field.onChange}
                    label="交付年月日"
                  />
                )}
              />
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 4 }}>
                  障害の内容
                </label>
                <textarea {...selfRegister('disability_description')} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
            </div>
          )}
        </form>
      </div>

      {/* 扶養親族一覧 */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a3a5c' }}>
            扶養親族一覧
          </h3>
          <button
            onClick={() => { setEditTarget(undefined); setShowModal(true) }}
            disabled={!declaration}
            style={{
              backgroundColor: '#1a56db',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              padding: '8px 16px',
              cursor: declaration ? 'pointer' : 'not-allowed',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            ＋ 追加
          </button>
        </div>

        {isLoading ? (
          <LoadingSpinner size="small" />
        ) : dependents.length === 0 ? (
          <p style={{ color: '#9ca3af', textAlign: 'center', padding: '1.5rem', fontSize: 14 }}>
            扶養親族が登録されていません
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  {['続柄', '氏名', '生年月日', '扶養区分', '障害区分', ''].map((h) => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dependents.map((dep) => {
                  const classification = classifyDependent(dep.birth_date, dep.is_living_together)
                  return (
                    <tr key={dep.id}>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{dep.relation_type}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>{dep.last_name} {dep.first_name}</td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', color: '#1a56db' }}>
                        {dep.birth_date}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                          {classification}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>
                        {disabilityLabels[dep.disability_type]}
                      </td>
                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleEdit(dep)}
                            style={{ padding: '4px 10px', border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer', fontSize: 12, backgroundColor: 'white' }}
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handleDelete(dep.id)}
                            style={{ padding: '4px 10px', border: '1px solid #fca5a5', borderRadius: 4, cursor: 'pointer', fontSize: 12, backgroundColor: '#fee2e2', color: '#991b1b' }}
                          >
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <DependentModal
          onClose={() => { setShowModal(false); setEditTarget(undefined) }}
          onSave={handleSave}
          initial={editTarget}
        />
      )}
    </div>
  )
}
