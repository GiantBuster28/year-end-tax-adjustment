import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getEmployees } from '../../api/admin'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { EmployeeListItem } from '../../types'

const inputStyle: React.CSSProperties = {
  padding: '7px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: 13,
}

const RoleBadge: React.FC<{ isAdmin: boolean }> = ({ isAdmin }) => (
  <span
    style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: 12,
      fontSize: 12,
      fontWeight: 600,
      backgroundColor: isAdmin ? '#fef3c7' : '#ccfbf1',
      color: isAdmin ? '#d97706' : '#0d9488',
      whiteSpace: 'nowrap',
    }}
  >
    {isAdmin ? '管理者' : '従業員'}
  </span>
)

const ActiveBadge: React.FC<{ isActive: boolean }> = ({ isActive }) => (
  <span
    style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: 12,
      fontSize: 12,
      fontWeight: 600,
      backgroundColor: isActive ? '#d1fae5' : '#f1f5f9',
      color: isActive ? '#065f46' : '#64748b',
      whiteSpace: 'nowrap',
    }}
  >
    {isActive ? '在籍中' : '退職'}
  </span>
)

export const EmployeeList: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [sortKey, setSortKey] = useState<'employee_code' | 'joined_date'>('employee_code')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const { data, isLoading, error } = useQuery({
    queryKey: ['employees'],
    queryFn: () => getEmployees({ page_size: 100 }),
  })

  const employees = data || []

  const departmentOptions = useMemo(
    () =>
      Array.from(new Set(employees.map((e) => e.department_name).filter(Boolean))).sort() as string[],
    [employees]
  )

  const filtered = employees
    .filter((e) => {
      if (departmentFilter && e.department_name !== departmentFilter) return false
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      return (
        e.employee_code.toLowerCase().includes(q) ||
        `${e.last_name}${e.first_name}`.toLowerCase().includes(q) ||
        `${e.last_name_kana || ''}${e.first_name_kana || ''}`.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      const va = a[sortKey] || ''
      const vb = b[sortKey] || ''
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    })

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const SortIcon = ({ k }: { k: string }) =>
    sortKey === k ? (sortDir === 'asc' ? <span> ▲</span> : <span> ▼</span>) : null

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a3a5c', marginBottom: '1.5rem' }}>
        従業員一覧
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
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          style={inputStyle}
        >
          <option value="">すべての部署</option>
          {departmentOptions.map((d) => (
            <option key={d} value={d}>{d}</option>
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
            該当する従業員がいません
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {[
                    { key: 'employee_code', label: '社員番号' },
                    { key: '', label: '氏名' },
                    { key: '', label: '部署' },
                    { key: '', label: 'メールアドレス' },
                    { key: 'joined_date', label: '入社日' },
                    { key: '', label: '権限' },
                    { key: '', label: '状態' },
                  ].map((col, i) => (
                    <th
                      key={i}
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
                {filtered.map((e: EmployeeListItem) => (
                  <tr
                    key={e.id}
                    style={{ borderBottom: '1px solid #f1f5f9' }}
                    onMouseEnter={(ev) => (ev.currentTarget.style.backgroundColor = '#f8fafc')}
                    onMouseLeave={(ev) => (ev.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace' }}>{e.employee_code}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 500 }}>{e.last_name} {e.first_name}</td>
                    <td style={{ padding: '10px 14px', color: '#6b7280' }}>{e.department_name || '-'}</td>
                    <td style={{ padding: '10px 14px', color: '#6b7280' }}>{e.email}</td>
                    <td style={{ padding: '10px 14px', color: '#6b7280' }}>
                      {e.joined_date ? new Date(e.joined_date).toLocaleDateString('ja-JP') : '-'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <RoleBadge isAdmin={e.is_admin} />
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <ActiveBadge isActive={e.is_active} />
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
