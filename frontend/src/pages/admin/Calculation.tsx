import React, { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getDashboardStats, runCalculation, getCalculationStatus } from '../../api/admin'
import { LoadingSpinner } from '../../components/LoadingSpinner'

const FISCAL_YEAR = 2026

export const Calculation: React.FC = () => {
  const navigate = useNavigate()
  const [jobId, setJobId] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [calcError, setCalcError] = useState('')

  const { data: stats } = useQuery({
    queryKey: ['dashboard', FISCAL_YEAR],
    queryFn: () => getDashboardStats(FISCAL_YEAR),
  })

  const { data: jobStatus } = useQuery({
    queryKey: ['calc-status', jobId],
    queryFn: () => getCalculationStatus(jobId!),
    enabled: !!jobId && isPolling,
    refetchInterval: isPolling ? 2000 : false,
  })

  useEffect(() => {
    if (jobStatus?.status === 'completed') {
      setIsPolling(false)
      setTimeout(() => navigate('/admin/calculation/results'), 1500)
    }
    if (jobStatus?.status === 'failed') {
      setIsPolling(false)
      setCalcError('計算処理が失敗しました')
    }
  }, [jobStatus, navigate])

  const calcMutation = useMutation({
    mutationFn: () => runCalculation(FISCAL_YEAR),
    onSuccess: (data) => {
      setJobId(data.job_id)
      setIsPolling(true)
      setCalcError('')
    },
    onError: () => {
      setCalcError('計算の開始に失敗しました')
    },
  })

  const progress = jobStatus
    ? Math.round((jobStatus.completed / Math.max(jobStatus.total, 1)) * 100)
    : 0

  const isRunning = isPolling || calcMutation.isPending

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a3a5c', marginBottom: '1.5rem' }}>
        年税額計算（SCR-103）
      </h2>

      {/* Stats */}
      {stats && (
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
            計算対象確認
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            {[
              { label: '対象年度', value: `${FISCAL_YEAR}年度` },
              { label: '承認済み件数', value: `${stats.approved_count}件` },
              { label: '計算完了件数', value: `${stats.calculated_count}件` },
            ].map(({ label, value }) => (
              <div
                key={label}
                style={{
                  backgroundColor: '#f8fafc',
                  borderRadius: 8,
                  padding: '1rem',
                  textAlign: 'center',
                }}
              >
                <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>{label}</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: '#1a3a5c', margin: '4px 0 0' }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calculation Panel */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: 12,
          padding: '1.5rem',
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
        }}
      >
        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a3a5c', marginBottom: '1rem' }}>
          計算実行
        </h3>

        <div
          style={{
            backgroundColor: '#fffbeb',
            border: '1px solid #fcd34d',
            borderRadius: 8,
            padding: '12px 16px',
            fontSize: 13,
            color: '#92400e',
            marginBottom: '1.5rem',
          }}
        >
          ⚠️ 計算を実行すると、承認済みの全申告書について年税額を計算します。
          実行前に全員の審査が完了していることを確認してください。
        </div>

        {calcError && (
          <div
            style={{
              backgroundColor: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: 8,
              padding: '12px 16px',
              color: '#991b1b',
              fontSize: 13,
              marginBottom: '1rem',
            }}
          >
            {calcError}
          </div>
        )}

        {/* Progress */}
        {isPolling && jobStatus && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: '#374151' }}>
                計算中... {jobStatus.completed}/{jobStatus.total}件
              </span>
              <span style={{ fontSize: 13, color: '#1a56db', fontWeight: 600 }}>{progress}%</span>
            </div>
            <div style={{ height: 10, backgroundColor: '#e2e8f0', borderRadius: 5 }}>
              <div
                style={{
                  height: '100%',
                  backgroundColor: '#1a56db',
                  borderRadius: 5,
                  width: `${progress}%`,
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
            {jobStatus.status === 'completed' && (
              <p style={{ fontSize: 13, color: '#059669', marginTop: 8, fontWeight: 600 }}>
                ✓ 計算が完了しました。結果画面に移動します...
              </p>
            )}
          </div>
        )}

        <button
          onClick={() => {
            if (confirm(`${FISCAL_YEAR}年度の年税額計算を実行しますか？`)) {
              calcMutation.mutateAsync()
            }
          }}
          disabled={isRunning}
          style={{
            backgroundColor: isRunning ? '#d1d5db' : '#1a3a5c',
            color: 'white',
            padding: '12px 28px',
            border: 'none',
            borderRadius: 8,
            cursor: isRunning ? 'not-allowed' : 'pointer',
            fontSize: 15,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {isRunning ? (
            <>
              <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
              計算実行中...
            </>
          ) : (
            '🧮 計算を実行する'
          )}
        </button>
      </div>
    </div>
  )
}
