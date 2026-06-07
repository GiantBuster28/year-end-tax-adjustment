import React, { useState } from 'react'
import { downloadReport } from '../../api/admin'

const FISCAL_YEAR = 2026

interface ReportType {
  id: string
  label: string
  description: string
  icon: string
  format: string
}

const reportTypes: ReportType[] = [
  {
    id: 'withholding_slip',
    label: '源泉徴収票（一括）',
    description: '全従業員の源泉徴収票をPDFで出力します',
    icon: '📄',
    format: 'PDF',
  },
  {
    id: 'salary_adjustment_ledger',
    label: '給与所得者異動申告書',
    description: '年末調整結果の一覧を出力します',
    icon: '📊',
    format: 'Excel',
  },
  {
    id: 'tax_payment_report',
    label: '納付書・所得税徴収高計算書',
    description: '12月分の所得税納付書を出力します',
    icon: '🧾',
    format: 'PDF',
  },
  {
    id: 'legal_payment_summary',
    label: '法定調書合計表',
    description: '法定調書の合計表を出力します',
    icon: '📋',
    format: 'PDF',
  },
  {
    id: 'adjustment_list',
    label: '年末調整一覧表',
    description: '還付・追徴の一覧（部署別集計付き）を出力します',
    icon: '📈',
    format: 'Excel',
  },
  {
    id: 'employee_list',
    label: '提出状況一覧',
    description: '申告書の提出状況を一覧出力します',
    icon: '👥',
    format: 'Excel',
  },
]

export const Reports: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState('')
  const [downloadSuccess, setDownloadSuccess] = useState('')

  const handleDownload = async () => {
    if (!selectedReport) return
    setDownloading(true)
    setDownloadError('')
    setDownloadSuccess('')

    try {
      const blob = await downloadReport(FISCAL_YEAR, selectedReport)
      const report = reportTypes.find((r) => r.id === selectedReport)
      const ext = report?.format === 'Excel' ? 'xlsx' : 'pdf'
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${report?.label}_${FISCAL_YEAR}年度.${ext}`
      link.click()
      URL.revokeObjectURL(url)
      setDownloadSuccess(`「${report?.label}」をダウンロードしました`)
    } catch {
      setDownloadError('ダウンロードに失敗しました。しばらくしてから再試行してください。')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a3a5c', marginBottom: '1.5rem' }}>
        帳票出力（SCR-105）
      </h2>

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
          帳票種別を選択
        </h3>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: '1rem' }}>
          出力年度: {FISCAL_YEAR}年度
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '0.75rem',
          }}
        >
          {reportTypes.map((report) => (
            <label
              key={report.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '1rem',
                border: `2px solid ${selectedReport === report.id ? '#1a56db' : '#e2e8f0'}`,
                borderRadius: 10,
                cursor: 'pointer',
                backgroundColor: selectedReport === report.id ? '#eff6ff' : 'white',
                transition: 'all 0.15s',
              }}
            >
              <input
                type="radio"
                name="report_type"
                value={report.id}
                checked={selectedReport === report.id}
                onChange={() => setSelectedReport(report.id)}
                style={{ marginTop: 2 }}
              />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 18 }}>{report.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#1a3a5c' }}>{report.label}</span>
                  <span
                    style={{
                      fontSize: 11,
                      backgroundColor: report.format === 'PDF' ? '#fee2e2' : '#d1fae5',
                      color: report.format === 'PDF' ? '#991b1b' : '#065f46',
                      padding: '1px 6px',
                      borderRadius: 4,
                      fontWeight: 600,
                    }}
                  >
                    {report.format}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>{report.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {downloadSuccess && (
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
          ✓ {downloadSuccess}
        </div>
      )}

      {downloadError && (
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
          {downloadError}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleDownload}
          disabled={!selectedReport || downloading}
          style={{
            backgroundColor: selectedReport && !downloading ? '#1a56db' : '#d1d5db',
            color: selectedReport ? 'white' : '#9ca3af',
            padding: '12px 28px',
            border: 'none',
            borderRadius: 8,
            cursor: selectedReport && !downloading ? 'pointer' : 'not-allowed',
            fontSize: 15,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {downloading ? '⟳ ダウンロード中...' : '📥 ダウンロード'}
        </button>
      </div>
    </div>
  )
}
