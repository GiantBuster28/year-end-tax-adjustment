import React, { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getCalculationResults, finalizeResults } from '../../api/admin'
import { LoadingSpinner } from '../../components/LoadingSpinner'

const FISCAL_YEAR = 2026

export const Results: React.FC = () => {
  const [finalizeSuccess, setFinalizeSuccess] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const { data: results = [], isLoading, error } = useQuery({
    queryKey: ['calc-results', FISCAL_YEAR],
    queryFn: () => getCalculationResults(FISCAL_YEAR),
  })

  const finalizeMutation = useMutation({
    mutationFn: () => finalizeResults(FISCAL_YEAR),
    onSuccess: () => {
      setFinalizeSuccess(true)
    },
  })

  const filtered = results.filter((r) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return r.employee_code.toLowerCase().includes(q) || r.employee_name.toLowerCase().includes(q)
  })

  const totalRefund = results.reduce(
    (sum, r) => sum + (r.adjustment_amount > 0 ? r.adjustment_amount : 0),
    0
  )
  const totalSurcharge = results.reduce(
    (sum, r) => sum + (r.adjustment_amount < 0 ? Math.abs(r.adjustment_amount) : 0),
    0
  )
  const refundCount = results.filter((r) => r.adjustment_amount > 0).length
  const surchargeCount = results.filter((r) => r.adjustment_amount < 0).length

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a3a5c', marginBottom: '1.5rem' }}>
        計算結果一覧（SCR-104）
      </h2>

      {/* Summary */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        {[
          { label: '総件数', value: `${results.length}件`, color: '#1a3a5c', icon: '📋' },
          { label: '還付件数', value: `${refundCount}件`, color: '#059669', icon: '💰' },
          { label: '追徴件数', value: `${surchargeCount}件`, color: '#dc2626', icon: '💸' },
          { label: '総還付額', value: `¥${totalRefund.toLocaleString()}`, color: '#059669', icon: '📈' },
          { label: '総追徴額', value: `¥${totalSurcharge.toLocaleString()}`, color: '#dc2626', icon: '📉' },
        ].map(({ label, value, color, icon }) => (
          <div
            key={label}
            style={{
              backgroundColor: 'white',
              borderRadius: 10,
              padding: '1rem',
              boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
              borderLeft: `4px solid ${color}`,
            }}
          >
            <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>{label}</p>
            <p style={{ fontSize: 18, fontWeight: 700, color, margin: '4px 0 0' }}>{value}</p>
          </div>
        ))}
      </div>

      {finalizeSuccess && (
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
          ✓ 計算結果を確定しました
        </div>
      )}

      {/* Table */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: 12,
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <input
            type="search"
            placeholder="社員番号・氏名で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '7px 12px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              fontSize: 13,
              width: 220,
            }}
          />
          {!finalizeSuccess && results.length > 0 && (
            <button
              onClick={() => {
                if (confirm('計算結果を確定しますか？確定後は変更できません。')) {
                  finalizeMutation.mutateAsync()
                }
              }}
              disabled={finalizeMutation.isPending}
              style={{
                backgroundColor: '#059669',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                padding: '8px 20px',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              ✓ 計算結果を確定する
            </button>
          )}
        </div>

        {isLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <p style={{ color: '#dc2626', padding: '1.5rem', textAlign: 'center' }}>
            データの取得に失敗しました
          </p>
        ) : filtered.length === 0 ? (
          <p style={{ color: '#9ca3af', padding: '3rem', textAlign: 'center' }}>
            計算結果がありません
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc' }}>
                  {['社員番号', '氏名', '支払金額', '課税所得', '算出税額', '源泉徴収税額', '調整額'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '10px 14px',
                        textAlign: h === '社員番号' || h === '氏名' ? 'left' : 'right',
                        color: '#64748b',
                        fontWeight: 600,
                        borderBottom: '1px solid #e2e8f0',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    style={{ borderBottom: '1px solid #f1f5f9' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace' }}>{r.employee_code}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 500 }}>{r.employee_name}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>¥{r.gross_salary.toLocaleString()}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>¥{r.taxable_income.toLocaleString()}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>¥{r.calculated_tax.toLocaleString()}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>¥{r.withheld_tax.toLocaleString()}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          color: r.adjustment_amount > 0 ? '#059669' : r.adjustment_amount < 0 ? '#dc2626' : '#6b7280',
                        }}
                      >
                        {r.adjustment_amount > 0 ? '+' : ''}
                        ¥{r.adjustment_amount.toLocaleString()}
                      </span>
                      <br />
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>
                        {r.adjustment_amount > 0 ? '還付' : r.adjustment_amount < 0 ? '追徴' : '±0'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
