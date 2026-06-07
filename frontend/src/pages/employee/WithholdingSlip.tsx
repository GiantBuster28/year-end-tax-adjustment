import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { getMyWithholdingSlips } from '../../api/admin'
import { LoadingSpinner } from '../../components/LoadingSpinner'

export const WithholdingSlip: React.FC = () => {
  const { data: slips = [], isLoading, error } = useQuery({
    queryKey: ['withholding-slips', 'me'],
    queryFn: getMyWithholdingSlips,
  })

  const handleDownload = (slip: { id: number; fiscal_year: number }) => {
    const link = document.createElement('a')
    link.href = `/api/v1/withholding_slips/${slip.id}/download`
    link.download = `源泉徴収票_${slip.fiscal_year}年度.pdf`
    link.click()
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a3a5c', marginBottom: '1.5rem' }}>
        源泉徴収票（SCR-017）
      </h2>

      <div
        style={{
          backgroundColor: 'white',
          borderRadius: 12,
          padding: '1.5rem',
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
        }}
      >
        {isLoading ? (
          <LoadingSpinner size="small" />
        ) : error ? (
          <p style={{ color: '#dc2626', textAlign: 'center', padding: '1.5rem' }}>
            データの取得に失敗しました
          </p>
        ) : slips.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>
            <div style={{ fontSize: 48, marginBottom: '0.75rem' }}>📄</div>
            <p style={{ fontSize: 14 }}>源泉徴収票がまだ発行されていません</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>年末調整が完了すると表示されます</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {slips.map((slip) => (
              <div
                key={slip.id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 600, color: '#1a3a5c', margin: 0 }}>
                    {slip.fiscal_year}年度 源泉徴収票
                  </h4>
                  <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', fontSize: 13 }}>
                    <div>
                      <span style={{ color: '#9ca3af' }}>支払金額: </span>
                      <span style={{ fontWeight: 600 }}>¥{slip.gross_salary.toLocaleString()}</span>
                    </div>
                    <div>
                      <span style={{ color: '#9ca3af' }}>源泉徴収税額: </span>
                      <span style={{ fontWeight: 600 }}>¥{slip.tax_withheld.toLocaleString()}</span>
                    </div>
                    <div>
                      <span style={{ color: '#9ca3af' }}>年末調整額: </span>
                      <span
                        style={{
                          fontWeight: 600,
                          color: slip.year_end_adjustment >= 0 ? '#059669' : '#dc2626',
                        }}
                      >
                        {slip.year_end_adjustment >= 0 ? '+' : ''}
                        ¥{slip.year_end_adjustment.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <p style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0 0' }}>
                    発行日: {new Date(slip.created_at).toLocaleDateString('ja-JP')}
                  </p>
                </div>
                <button
                  onClick={() => handleDownload(slip)}
                  style={{
                    backgroundColor: '#1a56db',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    padding: '8px 16px',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    whiteSpace: 'nowrap',
                  }}
                >
                  📥 ダウンロード
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
