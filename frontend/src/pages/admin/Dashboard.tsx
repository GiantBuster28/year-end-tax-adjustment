import React, { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getDashboardStats, sendReminderEmails } from '../../api/admin'
import { LoadingSpinner } from '../../components/LoadingSpinner'

const FISCAL_YEAR = 2026

const PieChart: React.FC<{ submitted: number; pending: number }> = ({ submitted, pending }) => {
  const total = submitted + pending
  if (total === 0) return <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>データなし</div>

  const pct = submitted / total
  const r = 70
  const cx = 90
  const cy = 90
  const circumference = 2 * Math.PI * r
  const dash = pct * circumference

  return (
    <svg width={180} height={180}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth={24} />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#1a56db"
        strokeWidth={24}
        strokeDasharray={`${dash} ${circumference - dash}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize={22} fontWeight={700} fill="#1a3a5c">
        {Math.round(pct * 100)}%
      </text>
      <text x={cx} y={cy + 16} textAnchor="middle" fontSize={12} fill="#6b7280">
        提出率
      </text>
    </svg>
  )
}

const KPICard: React.FC<{
  label: string
  value: number | string
  color: string
  icon: string
  unit?: string
}> = ({ label, value, color, icon, unit }) => (
  <div
    style={{
      backgroundColor: 'white',
      borderRadius: 12,
      padding: '1.25rem',
      boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
      borderLeft: `4px solid ${color}`,
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>{label}</p>
        <p style={{ fontSize: 28, fontWeight: 700, color: '#1a3a5c', margin: '4px 0 0' }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
          {unit && <span style={{ fontSize: 14, fontWeight: 400, marginLeft: 4 }}>{unit}</span>}
        </p>
      </div>
      <span style={{ fontSize: 28, opacity: 0.7 }}>{icon}</span>
    </div>
  </div>
)

export const Dashboard: React.FC = () => {
  const [reminderSent, setReminderSent] = useState(false)
  const [reminderCount, setReminderCount] = useState(0)

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboard', FISCAL_YEAR],
    queryFn: () => getDashboardStats(FISCAL_YEAR),
    refetchInterval: 60000,
  })

  const reminderMutation = useMutation({
    mutationFn: () => sendReminderEmails(FISCAL_YEAR),
    onSuccess: (data) => {
      setReminderCount(data.sent_count)
      setReminderSent(true)
      setTimeout(() => setReminderSent(false), 5000)
    },
  })

  if (isLoading) return <LoadingSpinner fullPage />

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a3a5c', margin: 0 }}>
          ダッシュボード（SCR-100）
        </h2>
        <span style={{ fontSize: 14, color: '#6b7280' }}>{FISCAL_YEAR}年度 年末調整</span>
      </div>

      {error ? (
        <div style={{ backgroundColor: '#fee2e2', borderRadius: 8, padding: '1rem', color: '#991b1b' }}>
          データの取得に失敗しました
        </div>
      ) : !stats ? null : (
        <>
          {/* KPI Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            <KPICard label="総従業員数" value={stats.total_employees} color="#1a3a5c" icon="👥" unit="名" />
            <KPICard label="提出済み" value={stats.submitted_count} color="#1a56db" icon="📤" unit="件" />
            <KPICard label="審査待ち" value={stats.under_review_count} color="#d97706" icon="⏳" unit="件" />
            <KPICard label="計算完了" value={stats.calculated_count} color="#0d9488" icon="✅" unit="件" />
          </div>

          {/* Chart + Actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {/* Pie Chart */}
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: 12,
                padding: '1.5rem',
                boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
              }}
            >
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a3a5c', marginBottom: '1rem' }}>
                提出状況
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <PieChart
                  submitted={stats.submitted_count}
                  pending={stats.total_employees - stats.submitted_count}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: '#1a56db' }} />
                    <span style={{ fontSize: 13 }}>提出済み ({stats.submitted_count})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: '#e2e8f0' }} />
                    <span style={{ fontSize: 13 }}>未提出 ({stats.total_employees - stats.submitted_count})</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: '#0d9488' }} />
                    <span style={{ fontSize: 13 }}>承認済み ({stats.approved_count})</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: 12,
                padding: '1.5rem',
                boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
              }}
            >
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a3a5c', marginBottom: '1rem' }}>
                管理アクション
              </h3>

              {reminderSent && (
                <div
                  style={{
                    backgroundColor: '#d1fae5',
                    border: '1px solid #6ee7b7',
                    borderRadius: 6,
                    padding: '10px 14px',
                    color: '#065f46',
                    fontSize: 13,
                    marginBottom: '1rem',
                  }}
                >
                  ✓ {reminderCount}名に催促メールを送信しました
                </div>
              )}

              <button
                onClick={() => {
                  if (confirm('未提出者に催促メールを送信しますか？')) {
                    reminderMutation.mutateAsync()
                  }
                }}
                disabled={reminderMutation.isPending}
                style={{
                  width: '100%',
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '12px',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                📧 未提出者に催促メールを送信
              </button>

              <div style={{ marginTop: '1rem', fontSize: 13, color: '#6b7280' }}>
                <p>未提出者数: <strong>{stats.total_employees - stats.submitted_count}名</strong></p>
                <p style={{ marginTop: 4 }}>提出率: <strong>{Math.round(stats.submission_rate * 100)}%</strong></p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
