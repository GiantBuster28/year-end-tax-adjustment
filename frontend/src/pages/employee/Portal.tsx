import React from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'
import { useDeclaration } from '../../hooks/useDeclaration'
import { StatusBadge } from '../../components/StatusBadge'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { toWareki } from '../../hooks/useWareki'
import { DeclarationStatus } from '../../types'

const FISCAL_YEAR = 2026

const menuItems = [
  {
    path: '/employee/declaration/dependent',
    label: '扶養控除等申告書',
    desc: '配偶者・扶養親族の情報',
    icon: '👨‍👩‍👧',
    color: '#1a56db',
  },
  {
    path: '/employee/declaration/insurance',
    label: '保険料控除申告書',
    desc: '生命保険・地震保険',
    icon: '🛡️',
    color: '#0d9488',
  },
  {
    path: '/employee/declaration/housing',
    label: '住宅ローン控除申告書',
    desc: '住宅借入金等特別控除',
    icon: '🏠',
    color: '#7c3aed',
  },
  {
    path: '/employee/declaration/attachments',
    label: '添付書類アップロード',
    desc: '証明書・添付書類',
    icon: '📎',
    color: '#d97706',
  },
  {
    path: '/employee/declaration/submit',
    label: '提出・確認',
    desc: '申告書の最終確認と提出',
    icon: '✅',
    color: '#059669',
  },
  {
    path: '/employee/status',
    label: '審査状況確認',
    desc: '提出後の状況を確認',
    icon: '📋',
    color: '#dc2626',
  },
]

const schedules = [
  { event: '申告書提出締切', date: '2026年11月30日（月）' },
  { event: '審査・計算期間', date: '2026年12月1日〜12月15日' },
  { event: '年末調整結果通知', date: '2026年12月18日（金）' },
  { event: '源泉徴収票配布', date: '2027年1月13日（水）' },
]

const statusSteps: { status: DeclarationStatus; label: string }[] = [
  { status: 'draft', label: '下書き' },
  { status: 'submitted', label: '提出済み' },
  { status: 'under_review', label: '審査中' },
  { status: 'approved', label: '承認済み' },
  { status: 'calculated', label: '計算完了' },
]

const getStepIndex = (status: DeclarationStatus): number => {
  const idx = statusSteps.findIndex((s) => s.status === status)
  return idx === -1 ? 0 : idx
}

export const Portal: React.FC = () => {
  const { user } = useAuthStore()
  const { declaration, isLoading, createDeclaration, isCreating } = useDeclaration()

  const warekiYear = toWareki(`${FISCAL_YEAR}-01-01`).split('年')[0] + '年'

  const handleCreate = async () => {
    try {
      await createDeclaration()
    } catch {
      // ignore
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Welcome Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1a3a5c, #1a56db)',
          borderRadius: 12,
          padding: '1.5rem 2rem',
          color: 'white',
          marginBottom: '1.5rem',
        }}
      >
        <p style={{ fontSize: 14, opacity: 0.8, margin: 0 }}>
          {FISCAL_YEAR}年度（{warekiYear}）年末調整
        </p>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: '4px 0 0' }}>
          {user?.name} さん、こんにちは
        </h2>
        <p style={{ fontSize: 13, opacity: 0.75, marginTop: 4 }}>
          {user?.department} | 社員番号: {user?.employee_code}
        </p>
      </div>

      {/* Declaration Status */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: 12,
          padding: '1.5rem',
          marginBottom: '1.5rem',
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1a3a5c', marginBottom: '1rem' }}>
          申告書ステータス
        </h3>

        {isLoading ? (
          <LoadingSpinner size="small" />
        ) : declaration ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.25rem' }}>
              <StatusBadge status={declaration.status} />
              {declaration.submitted_at && (
                <span style={{ fontSize: 13, color: '#6b7280' }}>
                  提出日: {new Date(declaration.submitted_at).toLocaleDateString('ja-JP')}
                </span>
              )}
            </div>
            {/* Progress Bar */}
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                {statusSteps.map((step, idx) => {
                  const currentIdx = getStepIndex(declaration.status)
                  const isCompleted = idx <= currentIdx
                  return (
                    <div
                      key={step.status}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        flex: 1,
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          backgroundColor: isCompleted ? '#1a56db' : '#e2e8f0',
                          color: isCompleted ? 'white' : '#94a3b8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 13,
                          fontWeight: 600,
                          zIndex: 2,
                          position: 'relative',
                        }}
                      >
                        {isCompleted ? '✓' : idx + 1}
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          marginTop: 4,
                          color: isCompleted ? '#1a56db' : '#94a3b8',
                          fontWeight: isCompleted ? 600 : 400,
                        }}
                      >
                        {step.label}
                      </span>
                    </div>
                  )
                })}
              </div>
              <div
                style={{
                  position: 'absolute',
                  top: 14,
                  left: '10%',
                  right: '10%',
                  height: 2,
                  backgroundColor: '#e2e8f0',
                  zIndex: 0,
                }}
              >
                <div
                  style={{
                    height: '100%',
                    backgroundColor: '#1a56db',
                    width: `${(getStepIndex(declaration.status) / (statusSteps.length - 1)) * 100}%`,
                    transition: 'width 0.5s',
                  }}
                />
              </div>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '1rem' }}>
            <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
              2026年度の申告書がまだ作成されていません
            </p>
            <button
              onClick={handleCreate}
              disabled={isCreating}
              style={{
                backgroundColor: '#1a56db',
                color: 'white',
                padding: '10px 24px',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {isCreating ? '作成中...' : '申告書を作成する'}
            </button>
          </div>
        )}
      </div>

      {/* Menu Grid */}
      <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1a3a5c', marginBottom: '1rem' }}>
        申告書メニュー
      </h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            style={{
              backgroundColor: 'white',
              borderRadius: 10,
              padding: '1.25rem',
              textDecoration: 'none',
              boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              transition: 'transform 0.15s, box-shadow 0.15s',
              borderLeft: `4px solid ${item.color}`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none'
              e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.1)'
            }}
          >
            <span style={{ fontSize: 28 }}>{item.icon}</span>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1a3a5c', margin: 0 }}>
                {item.label}
              </p>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Schedule Table */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: 12,
          padding: '1.5rem',
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1a3a5c', marginBottom: '1rem' }}>
          重要日程
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc' }}>
              <th
                style={{
                  padding: '10px 16px',
                  textAlign: 'left',
                  fontSize: 13,
                  color: '#64748b',
                  fontWeight: 600,
                  borderBottom: '1px solid #e2e8f0',
                }}
              >
                イベント
              </th>
              <th
                style={{
                  padding: '10px 16px',
                  textAlign: 'left',
                  fontSize: 13,
                  color: '#64748b',
                  fontWeight: 600,
                  borderBottom: '1px solid #e2e8f0',
                }}
              >
                日程
              </th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((schedule, idx) => (
              <tr key={idx}>
                <td
                  style={{
                    padding: '10px 16px',
                    fontSize: 14,
                    color: '#374151',
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  {schedule.event}
                </td>
                <td
                  style={{
                    padding: '10px 16px',
                    fontSize: 14,
                    color: '#1a56db',
                    fontWeight: 500,
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  {schedule.date}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
