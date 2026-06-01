import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface NavItem {
  path: string
  label: string
  icon: string
}

const employeeNavItems: NavItem[] = [
  { path: '/employee/portal', label: 'ポータル', icon: '🏠' },
  { path: '/employee/declaration/dependent', label: '扶養控除等申告書', icon: '👨‍👩‍👧' },
  { path: '/employee/declaration/insurance', label: '保険料控除', icon: '🛡️' },
  { path: '/employee/declaration/housing', label: '住宅ローン控除', icon: '🏠' },
  { path: '/employee/declaration/attachments', label: '添付書類', icon: '📎' },
  { path: '/employee/declaration/submit', label: '提出確認', icon: '✅' },
  { path: '/employee/status', label: '状況確認', icon: '📋' },
  { path: '/employee/withholding', label: '源泉徴収票', icon: '📄' },
]

const adminNavItems: NavItem[] = [
  { path: '/admin/dashboard', label: 'ダッシュボード', icon: '📊' },
  { path: '/admin/declarations', label: '申告書一覧', icon: '📋' },
  { path: '/admin/calculation', label: '年税額計算', icon: '🧮' },
  { path: '/admin/calculation/results', label: '計算結果', icon: '📈' },
  { path: '/admin/reports', label: '帳票出力', icon: '📄' },
]

interface LayoutProps {
  children: React.ReactNode
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const isAdmin = user?.is_admin
  const navItems = isAdmin ? adminNavItems : employeeNavItems

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header */}
      <header
        style={{
          backgroundColor: '#1a3a5c',
          color: 'white',
          padding: '0 1.5rem',
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: 20,
              cursor: 'pointer',
              padding: '4px 8px',
            }}
          >
            ☰
          </button>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>年末調整システム</h1>
          <span
            style={{
              fontSize: 12,
              backgroundColor: isAdmin ? '#d97706' : '#0d9488',
              padding: '2px 8px',
              borderRadius: 10,
            }}
          >
            {isAdmin ? '管理者' : '従業員'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: 14 }}>
            {user?.name}（{user?.department}）
          </span>
          <button
            onClick={logout}
            style={{
              backgroundColor: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: 'white',
              padding: '6px 14px',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            ログアウト
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1 }}>
        {/* Sidebar */}
        <nav
          style={{
            width: sidebarOpen ? 220 : 0,
            minWidth: sidebarOpen ? 220 : 0,
            backgroundColor: '#1a3a5c',
            overflowX: 'hidden',
            transition: 'width 0.3s, min-width 0.3s',
            paddingTop: '1rem',
          }}
        >
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '10px 16px',
                  color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
                  textDecoration: 'none',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                  borderLeft: isActive ? '3px solid #1a56db' : '3px solid transparent',
                  fontSize: 13,
                  whiteSpace: 'nowrap',
                  transition: 'background 0.2s',
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Main Content */}
        <main
          style={{
            flex: 1,
            padding: '1.5rem',
            overflowY: 'auto',
            backgroundColor: '#f0f4f8',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
