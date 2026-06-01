import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'

interface ProtectedRouteProps {
  children: React.ReactNode
  adminOnly?: boolean
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminOnly = false }) => {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (adminOnly && !user?.is_admin) {
    return <Navigate to="/employee/portal" replace />
  }

  if (!adminOnly && user?.is_admin) {
    return <Navigate to="/admin/dashboard" replace />
  }

  return <>{children}</>
}
