import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import { login as apiLogin, logout as apiLogout } from '../api/auth'
import { LoginPayload } from '../api/auth'

export const useAuth = () => {
  const { user, token, isAuthenticated, setAuth, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  const login = async (payload: LoginPayload) => {
    const response = await apiLogin(payload)
    setAuth(response.user, response.token)
    if (response.user.is_admin) {
      navigate('/admin/dashboard')
    } else {
      navigate('/employee/portal')
    }
  }

  const logout = async () => {
    try {
      await apiLogout()
    } catch {
      // ignore errors on logout
    } finally {
      clearAuth()
      navigate('/login')
    }
  }

  return { user, token, isAuthenticated, login, logout }
}
