import React, { Component, ErrorInfo, ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Login } from './pages/Login'
import { Portal } from './pages/employee/Portal'
import { DependentForm } from './pages/employee/DependentForm'
import { InsuranceForm } from './pages/employee/InsuranceForm'
import { HousingForm } from './pages/employee/HousingForm'
import { AttachmentUpload } from './pages/employee/AttachmentUpload'
import { SubmitConfirm } from './pages/employee/SubmitConfirm'
import { StatusCheck } from './pages/employee/StatusCheck'
import { WithholdingSlip } from './pages/employee/WithholdingSlip'
import { Dashboard } from './pages/admin/Dashboard'
import { DeclarationList } from './pages/admin/DeclarationList'
import { DeclarationDetail } from './pages/admin/DeclarationDetail'
import { Calculation } from './pages/admin/Calculation'
import { Results } from './pages/admin/Results'
import { Reports } from './pages/admin/Reports'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
})

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '1rem',
            padding: '2rem',
          }}
        >
          <h1 style={{ fontSize: 22, color: '#dc2626', fontWeight: 700 }}>
            予期しないエラーが発生しました
          </h1>
          <p style={{ color: '#6b7280', fontSize: 14 }}>
            {this.state.error?.message || 'Unknown error'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: '#1a56db',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '10px 24px',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            ページを再読み込み
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

const EmployeeLayout: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ProtectedRoute>
    <Layout>{children}</Layout>
  </ProtectedRoute>
)

const AdminLayout: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ProtectedRoute adminOnly>
    <Layout>{children}</Layout>
  </ProtectedRoute>
)

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />

            {/* Employee Routes */}
            <Route
              path="/employee/portal"
              element={<EmployeeLayout><Portal /></EmployeeLayout>}
            />
            <Route
              path="/employee/declaration/dependent"
              element={<EmployeeLayout><DependentForm /></EmployeeLayout>}
            />
            <Route
              path="/employee/declaration/insurance"
              element={<EmployeeLayout><InsuranceForm /></EmployeeLayout>}
            />
            <Route
              path="/employee/declaration/housing"
              element={<EmployeeLayout><HousingForm /></EmployeeLayout>}
            />
            <Route
              path="/employee/declaration/attachments"
              element={<EmployeeLayout><AttachmentUpload /></EmployeeLayout>}
            />
            <Route
              path="/employee/declaration/submit"
              element={<EmployeeLayout><SubmitConfirm /></EmployeeLayout>}
            />
            <Route
              path="/employee/status"
              element={<EmployeeLayout><StatusCheck /></EmployeeLayout>}
            />
            <Route
              path="/employee/withholding"
              element={<EmployeeLayout><WithholdingSlip /></EmployeeLayout>}
            />

            {/* Admin Routes */}
            <Route
              path="/admin/dashboard"
              element={<AdminLayout><Dashboard /></AdminLayout>}
            />
            <Route
              path="/admin/declarations"
              element={<AdminLayout><DeclarationList /></AdminLayout>}
            />
            <Route
              path="/admin/declarations/:id"
              element={<AdminLayout><DeclarationDetail /></AdminLayout>}
            />
            <Route
              path="/admin/calculation"
              element={<AdminLayout><Calculation /></AdminLayout>}
            />
            <Route
              path="/admin/calculation/results"
              element={<AdminLayout><Results /></AdminLayout>}
            />
            <Route
              path="/admin/reports"
              element={<AdminLayout><Reports /></AdminLayout>}
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
