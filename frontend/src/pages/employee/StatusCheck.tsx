import React from 'react'
import { useDeclaration } from '../../hooks/useDeclaration'
import { StatusBadge } from '../../components/StatusBadge'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { DeclarationStatus } from '../../types'

const historyData: { date: string; status: DeclarationStatus; note: string }[] = []

export const StatusCheck: React.FC = () => {
  const { declaration, isLoading } = useDeclaration()

  const timelineSteps: { status: DeclarationStatus; label: string; date?: string }[] = [
    { status: 'draft', label: '下書き作成' },
    { status: 'submitted', label: '提出', date: declaration?.submitted_at },
    { status: 'under_review', label: '審査中' },
    { status: 'approved', label: '承認', date: declaration?.approved_at },
    { status: 'calculated', label: '計算完了' },
  ]

  const statusOrder: DeclarationStatus[] = ['draft', 'submitted', 'under_review', 'approved', 'calculated']
  const currentIdx = declaration ? statusOrder.indexOf(declaration.status) : -1

  if (isLoading) return <LoadingSpinner fullPage />

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a3a5c', marginBottom: '1.5rem' }}>
        審査状況確認（SCR-016）
      </h2>

      {!declaration ? (
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: 12,
            padding: '3rem',
            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
            textAlign: 'center',
            color: '#9ca3af',
          }}
        >
          申告書が作成されていません
        </div>
      ) : (
        <>
          {/* Status Card */}
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
              現在のステータス
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <StatusBadge status={declaration.status} />
              <div style={{ fontSize: 13, color: '#6b7280' }}>
                {declaration.status === 'rejected' && (
                  <span style={{ color: '#dc2626', fontWeight: 600 }}>差し戻されています。修正後に再提出してください。</span>
                )}
                {declaration.status === 'draft' && '申告書を作成して提出してください'}
                {declaration.status === 'submitted' && '提出済みです。審査をお待ちください。'}
                {declaration.status === 'under_review' && '現在審査中です。しばらくお待ちください。'}
                {declaration.status === 'approved' && '承認されました。年税額の計算を待っています。'}
                {declaration.status === 'calculated' && '年末調整の計算が完了しました。'}
              </div>
            </div>

            <div style={{ marginTop: '1.25rem', display: 'flex', gap: '2rem', fontSize: 13 }}>
              <div>
                <span style={{ color: '#9ca3af' }}>申告年度: </span>
                <span style={{ fontWeight: 600 }}>{declaration.fiscal_year}年度</span>
              </div>
              <div>
                <span style={{ color: '#9ca3af' }}>作成日: </span>
                <span style={{ fontWeight: 600 }}>
                  {new Date(declaration.created_at).toLocaleDateString('ja-JP')}
                </span>
              </div>
              {declaration.submitted_at && (
                <div>
                  <span style={{ color: '#9ca3af' }}>提出日: </span>
                  <span style={{ fontWeight: 600 }}>
                    {new Date(declaration.submitted_at).toLocaleDateString('ja-JP')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: 12,
              padding: '1.5rem',
              boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
              marginBottom: '1.5rem',
            }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a3a5c', marginBottom: '1.5rem' }}>
              審査フロー
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {timelineSteps.map((step, idx) => {
                const isCompleted = idx <= currentIdx && declaration.status !== 'rejected'
                const isCurrent = idx === currentIdx
                const isRejected = declaration.status === 'rejected' && idx === currentIdx

                return (
                  <div key={step.status} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          backgroundColor: isRejected ? '#dc2626' : isCompleted ? '#1a56db' : '#e2e8f0',
                          color: isCompleted || isRejected ? 'white' : '#94a3b8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 14,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {isRejected ? '✗' : isCompleted ? '✓' : idx + 1}
                      </div>
                      {idx < timelineSteps.length - 1 && (
                        <div
                          style={{
                            width: 2,
                            height: 40,
                            backgroundColor: idx < currentIdx ? '#1a56db' : '#e2e8f0',
                          }}
                        />
                      )}
                    </div>
                    <div style={{ paddingTop: 4, paddingBottom: 24 }}>
                      <p
                        style={{
                          fontSize: 14,
                          fontWeight: isCurrent ? 700 : 500,
                          color: isRejected ? '#dc2626' : isCompleted ? '#1a3a5c' : '#94a3b8',
                          margin: 0,
                        }}
                      >
                        {step.label}
                        {isCurrent && !isRejected && (
                          <span
                            style={{
                              fontSize: 11,
                              backgroundColor: '#dbeafe',
                              color: '#1d4ed8',
                              padding: '2px 8px',
                              borderRadius: 10,
                              marginLeft: 8,
                            }}
                          >
                            現在
                          </span>
                        )}
                      </p>
                      {step.date && (
                        <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>
                          {new Date(step.date).toLocaleDateString('ja-JP')}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
