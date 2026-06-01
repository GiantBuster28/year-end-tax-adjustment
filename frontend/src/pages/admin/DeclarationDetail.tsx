import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDeclaration, approveDeclaration, rejectDeclaration } from '../../api/declarations'
import { getDependents } from '../../api/dependents'
import { getInsuranceDeductions } from '../../api/insurance'
import { getHousingDeduction } from '../../api/housing'
import { getAttachments } from '../../api/attachments'
import { StatusBadge } from '../../components/StatusBadge'
import { LoadingSpinner } from '../../components/LoadingSpinner'

const cardStyle: React.CSSProperties = {
  backgroundColor: 'white',
  borderRadius: 12,
  padding: '1.5rem',
  boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
  marginBottom: '1.25rem',
}

export const DeclarationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const declarationId = parseInt(id || '0', 10)
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [actionSuccess, setActionSuccess] = useState('')

  const { data: declaration, isLoading } = useQuery({
    queryKey: ['declaration', declarationId],
    queryFn: () => getDeclaration(declarationId),
    enabled: !!declarationId,
  })

  const { data: dependents = [] } = useQuery({
    queryKey: ['dependents', declarationId],
    queryFn: () => getDependents(declarationId),
    enabled: !!declarationId,
  })

  const { data: insurances = [] } = useQuery({
    queryKey: ['insurance', declarationId],
    queryFn: () => getInsuranceDeductions(declarationId),
    enabled: !!declarationId,
  })

  const { data: housing } = useQuery({
    queryKey: ['housing', declarationId],
    queryFn: () => getHousingDeduction(declarationId),
    enabled: !!declarationId,
  })

  const { data: attachments = [] } = useQuery({
    queryKey: ['attachments', declarationId],
    queryFn: () => getAttachments(declarationId),
    enabled: !!declarationId,
  })

  const approveMutation = useMutation({
    mutationFn: () => approveDeclaration(declarationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['declaration', declarationId] })
      setActionSuccess('承認しました')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: () => rejectDeclaration(declarationId, rejectReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['declaration', declarationId] })
      setShowRejectForm(false)
      setRejectReason('')
      setActionSuccess('差し戻しました')
    },
  })

  if (isLoading) return <LoadingSpinner fullPage />
  if (!declaration) return <div style={{ padding: '2rem', color: '#dc2626' }}>申告書が見つかりません</div>

  const canReview = ['submitted', 'under_review'].includes(declaration.status)

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => navigate('/admin/declarations')}
          style={{ background: 'none', border: 'none', color: '#1a56db', cursor: 'pointer', fontSize: 14 }}
        >
          ← 一覧に戻る
        </button>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a3a5c', margin: 0 }}>
          申告書詳細（SCR-102）
        </h2>
      </div>

      {actionSuccess && (
        <div
          style={{
            backgroundColor: '#d1fae5',
            border: '1px solid #6ee7b7',
            borderRadius: 8,
            padding: '12px 16px',
            color: '#065f46',
            fontSize: 14,
            fontWeight: 600,
            marginBottom: '1rem',
          }}
        >
          ✓ {actionSuccess}
        </div>
      )}

      {/* Header */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1a3a5c', margin: 0 }}>
              {declaration.fiscal_year}年度 年末調整申告書
            </h3>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>
              申告書ID: #{declaration.id}
            </p>
          </div>
          <StatusBadge status={declaration.status} />
        </div>

        <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem', fontSize: 13 }}>
          {declaration.submitted_at && (
            <div>
              <span style={{ color: '#9ca3af' }}>提出日: </span>
              <span>{new Date(declaration.submitted_at).toLocaleDateString('ja-JP')}</span>
            </div>
          )}
          {declaration.approved_at && (
            <div>
              <span style={{ color: '#9ca3af' }}>承認日: </span>
              <span>{new Date(declaration.approved_at).toLocaleDateString('ja-JP')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Dependents */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a3a5c', marginBottom: '0.75rem' }}>
          扶養親族 ({dependents.length}名)
        </h3>
        {dependents.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: 13 }}>登録なし</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                {['続柄', '氏名', '生年月日', '年間所得', '同居'].map((h) => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dependents.map((d) => (
                <tr key={d.id}>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>{d.relation_type}</td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>{d.last_name} {d.first_name}</td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>{d.birth_date}</td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>¥{d.annual_income.toLocaleString()}</td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>{d.is_living_together ? '○' : '×'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Insurance */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a3a5c', marginBottom: '0.75rem' }}>
          保険料控除 ({insurances.length}件)
        </h3>
        {insurances.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: 13 }}>登録なし</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                {['種別', '保険会社', '支払保険料', '控除額'].map((h) => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {insurances.map((ins) => (
                <tr key={ins.id}>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>{ins.insurance_type}</td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>{ins.insurance_company}</td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9' }}>¥{ins.payment_amount.toLocaleString()}</td>
                  <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', color: '#059669', fontWeight: 600 }}>¥{ins.deduction_amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Housing */}
      {housing && (
        <div style={cardStyle}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a3a5c', marginBottom: '0.75rem' }}>
            住宅ローン控除
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: 13 }}>
            <div><span style={{ color: '#9ca3af' }}>居住開始日: </span>{housing.residence_start_date}</div>
            <div><span style={{ color: '#9ca3af' }}>ローン残高①: </span>¥{housing.loan_balance_1.toLocaleString()}</div>
            {housing.loan_balance_2 && (
              <div><span style={{ color: '#9ca3af' }}>ローン残高②: </span>¥{housing.loan_balance_2.toLocaleString()}</div>
            )}
            <div><span style={{ color: '#9ca3af' }}>控除額: </span><strong style={{ color: '#059669' }}>¥{housing.deduction_amount.toLocaleString()}</strong></div>
          </div>
        </div>
      )}

      {/* Attachments */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a3a5c', marginBottom: '0.75rem' }}>
          添付書類 ({attachments.length}件)
        </h3>
        {attachments.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: 13 }}>添付書類なし</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {attachments.map((att) => (
              <span
                key={att.id}
                style={{
                  fontSize: 13,
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  borderRadius: 6,
                  padding: '4px 10px',
                }}
              >
                📎 {att.file_name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Approve/Reject */}
      {canReview && (
        <div style={cardStyle}>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a3a5c', marginBottom: '1rem' }}>
            審査アクション
          </h3>

          {showRejectForm ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>
                  差し戻し理由 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={4}
                  placeholder="差し戻しの理由を入力してください..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                    fontSize: 14,
                    resize: 'vertical',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => setShowRejectForm(false)}
                  style={{ padding: '8px 20px', border: '1px solid #d1d5db', borderRadius: 6, background: 'white', cursor: 'pointer', fontSize: 14 }}
                >
                  キャンセル
                </button>
                <button
                  onClick={() => rejectMutation.mutateAsync()}
                  disabled={!rejectReason.trim() || rejectMutation.isPending}
                  style={{
                    padding: '8px 20px',
                    backgroundColor: rejectReason.trim() ? '#dc2626' : '#d1d5db',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    cursor: rejectReason.trim() ? 'pointer' : 'not-allowed',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  差し戻す
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => {
                  if (confirm('この申告書を承認しますか？')) approveMutation.mutateAsync()
                }}
                disabled={approveMutation.isPending}
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                ✓ 承認する
              </button>
              <button
                onClick={() => setShowRejectForm(true)}
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  border: '1px solid #fca5a5',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                ✗ 差し戻す
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
