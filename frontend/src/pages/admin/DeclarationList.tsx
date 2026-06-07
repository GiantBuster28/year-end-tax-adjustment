import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getDeclarations } from '../../api/declarations'
import { StatusBadge } from '../../components/StatusBadge'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { DeclarationStatus } from '../../types'

const FISCAL_YEAR = 2026

const statusOptions: { value: string; label: string }[] = [
  { value: '', label: 'すべて' },
  { value: 'draft', label: '下書き' },
  { value: 'submitted', label: '提出済み' },
  { value: 'under_review', label: '審査中' },
  { value: 'approved', label: '承認済み' },
  { value: 'rejected', label: '差し戻し' },
  { value: 'calculated', label: '計算完了' },
]

const inputStyle: React.CSSProperties = {
  padding: '7px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: 13,
}

export const DeclarationList: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortKey, setSortKey] = useState<'updated_at' | 'employee_code'>('updated_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const { data, isLoading, error } = useQuery({
    queryKey: ['declarations', FISCAL_YEAR, statusFilter],
    queryFn: () =>
      getDeclarations({
        fiscal_year: FISCAL_YEAR,
        status: statusFilter || undefined,
        per_page: 100,
      }),
    refetchInterval: 30000,
  })

  const declarations = Array.isArray(data) ? data : data?.items || []

  const filtered = declarations
    .filter((d: { employee_code?: string; employee_name?: string }) => {
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      return (
        d.employee_code?.toLowerCase().includes(q) ||
        d.employee_name?.toLowerCase().includes(q)
      )
    })
    .sort((a: Record<string, string>, b: Record<string, string>) => {
      const va = a[sortKey] || ''
      const vb = b[sortKey] || ''
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    })

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const SortIcon = ({ k }: { k: string }) =>
    sortKey === k ? (sortDir === 'asc' ? <span> ▲</span> : <span> ▼</span>) : null

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a3a5c', marginBottom: '1.5rem' }}>
        申告書一覧（SCR-101）
      </h2>

      {/* Filters */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: 12,
          padding: '1rem 1.5rem',
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
          marginBottom: '1rem',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <input
          type="search"
          placeholder="社員番号・氏名で検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ ...inputStyle, width: 220 }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={inputStyle}
        >
          {statusOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <span style={{ fontSize: 13, color: '#6b7280', marginLeft: 'auto' }}>
          {filtered.length}件
        </span>
      </div>

      {/* Table */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: 12,
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
          overflow: 'hidden',
        }}
      >
        {isLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <p style={{ color: '#dc2626', padding: '1.5rem', textAlign: 'center' }}>
            データの取得に失敗しました
          </p>
        ) : filtered.length === 0 ? (
          <p style={{ color: '#9ca3af', padding: '3rem', textAlign: 'center' }}>
            該当する申告書がありません
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {[
                    { key: 'employee_code', label: '社員番号' },
                    { key: 'employee_name', label: '氏名' },
                    { key: 'department', label: '部署' },
                    { key: 'status', label: 'ステータス' },
                    { key: 'submitted_at', label: '提出日' },
                    { key: 'updated_at', label: '更新日' },
                    { key: '', label: '' },
                  ].map((col) => (
                    <th
                      key={col.key}
                      onClick={() => col.key && toggleSort(col.key as typeof sortKey)}
                      style={{
                        padding: '10px 14px',
                        textAlign: 'left',
                        color: '#64748b',
                        fontWeight: 600,
                        cursor: col.key ? 'pointer' : 'default',
                        userSelect: 'none',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {col.label}
                      {col.key && <SortIcon k={col.key} />}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((d: {
                  id: number
                  employee_code: string
                  employee_name?: string
                  department?: string
                  status: DeclarationStatus
                  submitted_at?: string
                  updated_at: string
                }) => (
                  <tr
                    key={d.id}
                    style={{ borderBottom: '1px solid #f1f5f9' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace' }}>{d.employee_code}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 500 }}>{d.employee_name || '-'}</td>
                    <td style={{ padding: '10px 14px', color: '#6b7280' }}>{d.department || '-'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <StatusBadge status={d.status} />
                    </td>
                    <td style={{ padding: '10px 14px', color: '#6b7280' }}>
                      {d.submitted_at ? new Date(d.submitted_at).toLocaleDateString('ja-JP') : '-'}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#6b7280' }}>
                      {new Date(d.updated_at).toLocaleDateString('ja-JP')}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <Link
                        to={`/admin/declarations/${d.id}`}
                        style={{
                          color: '#1a56db',
                          textDecoration: 'none',
                          fontSize: 13,
                          fontWeight: 500,
                        }}
                      >
                        詳細 →
                      </Link>
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
