import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getDependents } from '../../api/dependents'
import { getInsuranceDeductions } from '../../api/insurance'
import { getHousingDeduction } from '../../api/housing'
import { getAttachments } from '../../api/attachments'
import { useDeclaration } from '../../hooks/useDeclaration'
import { StatusBadge } from '../../components/StatusBadge'
import { LoadingSpinner } from '../../components/LoadingSpinner'

const SummaryRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <tr>
    <td style={{ padding: '8px 12px', color: '#6b7280', fontSize: 13, width: 160, borderBottom: '1px solid #f1f5f9' }}>{label}</td>
    <td style={{ padding: '8px 12px', color: '#374151', fontSize: 13, borderBottom: '1px solid #f1f5f9' }}>{value}</td>
  </tr>
)

export const SubmitConfirm: React.FC = () => {
  const navigate = useNavigate()
  const { declaration, isLoading: declLoading, submitDeclaration, isSubmitting } = useDeclaration()
  const [checks, setChecks] = useState({ check1: false, check2: false, check3: false })
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const { data: dependents = [] } = useQuery({
    queryKey: ['dependents', declaration?.id],
    queryFn: () => getDependents(declaration!.id),
    enabled: !!declaration?.id,
  })

  const { data: insurances = [] } = useQuery({
    queryKey: ['insurance', declaration?.id],
    queryFn: () => getInsuranceDeductions(declaration!.id),
    enabled: !!declaration?.id,
  })

  const { data: housing } = useQuery({
    queryKey: ['housing', declaration?.id],
    queryFn: () => getHousingDeduction(declaration!.id),
    enabled: !!declaration?.id,
  })

  const { data: attachments = [] } = useQuery({
    queryKey: ['attachments', declaration?.id],
    queryFn: () => getAttachments(declaration!.id),
    enabled: !!declaration?.id,
  })

  const allChecked = Object.values(checks).every(Boolean)

  const handleSubmit = async () => {
    if (!declaration || !allChecked) return
    setSubmitError('')
    try {
      await submitDeclaration(declaration.id)
      setSubmitSuccess(true)
      setTimeout(() => navigate('/employee/status'), 2000)
    } catch {
      setSubmitError('提出に失敗しました。もう一度お試しください。')
    }
  }

  if (declLoading) return <LoadingSpinner fullPage />

  if (!declaration) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
        <p>申告書が作成されていません</p>
      </div>
    )
  }

  const alreadySubmitted = ['submitted', 'under_review', 'approved', 'calculated'].includes(declaration.status)

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a3a5c', marginBottom: '1.5rem' }}>
        提出確認（SCR-015）
      </h2>

      {submitSuccess && (
        <div
          style={{
            backgroundColor: '#d1fae5',
            border: '1px solid #6ee7b7',
            borderRadius: 8,
            padding: '1rem',
            color: '#065f46',
            fontSize: 15,
            fontWeight: 600,
            textAlign: 'center',
            marginBottom: '1rem',
          }}
        >
          ✓ 申告書を提出しました。審査状況確認画面に移動します...
        </div>
      )}

      {/* Current Status */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: 12,
          padding: '1.5rem',
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
          marginBottom: '1.5rem',
        }}
      >
        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a3a5c', marginBottom: '0.75rem' }}>
          申告書ステータス
        </h3>
        <StatusBadge status={declaration.status} />
        {alreadySubmitted && (
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 8 }}>
            この申告書は既に提出済みです
          </p>
        )}
      </div>

      {/* Summary */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: 12,
          padding: '1.5rem',
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
          marginBottom: '1.5rem',
        }}
      >
        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a3a5c', marginBottom: '1rem' }}>
          入力内容サマリー
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <SummaryRow label="申告年度" value={`${declaration.fiscal_year}年度`} />
            <SummaryRow
              label="扶養親族"
              value={
                <span>
                  {dependents.length}名
                  {dependents.length > 0 && (
                    <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 8 }}>
                      （{dependents.map((d) => `${d.last_name} ${d.first_name}`).join('、')}）
                    </span>
                  )}
                </span>
              }
            />
            <SummaryRow
              label="保険料控除"
              value={
                <span>
                  {insurances.length}件
                  {insurances.length > 0 && (
                    <span style={{ fontSize: 12, color: '#059669', marginLeft: 8 }}>
                      合計控除額: ¥{insurances.reduce((s, i) => s + i.deduction_amount, 0).toLocaleString()}
                    </span>
                  )}
                </span>
              }
            />
            <SummaryRow
              label="住宅ローン控除"
              value={housing ? (
                <span style={{ color: '#059669' }}>
                  あり（¥{housing.deduction_amount.toLocaleString()}）
                </span>
              ) : '該当なし'}
            />
            <SummaryRow
              label="添付書類"
              value={`${attachments.length}件`}
            />
          </tbody>
        </table>
      </div>

      {/* Checklist */}
      {!alreadySubmitted && (
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: 12,
            padding: '1.5rem',
            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
            marginBottom: '1.5rem',
          }}
        >
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a3a5c', marginBottom: '1rem' }}>
            提出前チェックリスト
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { key: 'check1', label: '入力内容に誤りがないことを確認しました' },
              { key: 'check2', label: '必要な証明書類をすべてアップロードしました' },
              { key: 'check3', label: '一度提出すると、管理者の承認なしに修正できないことを理解しました' },
            ].map(({ key, label }) => (
              <label key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={checks[key as keyof typeof checks]}
                  onChange={(e) => setChecks((prev) => ({ ...prev, [key]: e.target.checked }))}
                  style={{ width: 18, height: 18, marginTop: 2 }}
                />
                <span style={{ fontSize: 14, color: '#374151', lineHeight: 1.5 }}>{label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {submitError && (
        <div
          style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: 8,
            padding: '12px 16px',
            color: '#991b1b',
            fontSize: 14,
            marginBottom: '1rem',
          }}
        >
          {submitError}
        </div>
      )}

      {!alreadySubmitted && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleSubmit}
            disabled={!allChecked || isSubmitting}
            style={{
              backgroundColor: allChecked && !isSubmitting ? '#059669' : '#d1d5db',
              color: allChecked ? 'white' : '#9ca3af',
              padding: '12px 32px',
              border: 'none',
              borderRadius: 8,
              cursor: allChecked && !isSubmitting ? 'pointer' : 'not-allowed',
              fontSize: 15,
              fontWeight: 600,
              transition: 'background 0.2s',
            }}
          >
            {isSubmitting ? '提出中...' : '申告書を提出する'}
          </button>
        </div>
      )}
    </div>
  )
}
