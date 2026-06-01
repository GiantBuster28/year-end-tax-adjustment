import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '../hooks/useAuth'
import { useAuthStore } from '../stores/auth'

const schema = z.object({
  employee_code: z.string().min(1, '社員番号を入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
  role: z.enum(['employee', 'admin']),
})

type FormData = z.infer<typeof schema>

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: 14,
  color: '#1f2937',
  outline: 'none',
}

export const Login: React.FC = () => {
  const { login } = useAuth()
  const { isAuthenticated, user } = useAuthStore()
  const [apiError, setApiError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'employee' },
  })

  if (isAuthenticated && user) {
    return <Navigate to={user.is_admin ? '/admin/dashboard' : '/employee/portal'} replace />
  }

  const onSubmit = async (data: FormData) => {
    setApiError('')
    setIsLoading(true)
    try {
      await login(data)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      setApiError(error?.response?.data?.message || 'ログインに失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a3a5c 0%, #1a56db 100%)',
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: 12,
          padding: '2.5rem',
          width: '100%',
          maxWidth: 420,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a3a5c', margin: 0 }}>
            年末調整システム
          </h1>
          <p style={{ fontSize: 14, color: '#6b7280', marginTop: 8 }}>
            2026年度 年末調整申告
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {apiError && (
            <div
              style={{
                backgroundColor: '#fee2e2',
                border: '1px solid #fca5a5',
                borderRadius: 6,
                padding: '10px 14px',
                color: '#991b1b',
                fontSize: 14,
              }}
            >
              {apiError}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
              社員番号 <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              {...register('employee_code')}
              placeholder="例: EMP001"
              style={{
                ...inputStyle,
                borderColor: errors.employee_code ? '#ef4444' : '#d1d5db',
              }}
            />
            {errors.employee_code && (
              <p style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>
                {errors.employee_code.message}
              </p>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
              パスワード <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              {...register('password')}
              type="password"
              placeholder="••••••••"
              style={{
                ...inputStyle,
                borderColor: errors.password ? '#ef4444' : '#d1d5db',
              }}
            />
            {errors.password && (
              <p style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>
                {errors.password.message}
              </p>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 8 }}>
              ログイン区分
            </label>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="radio" {...register('role')} value="employee" />
                <span style={{ fontSize: 14 }}>従業員</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="radio" {...register('role')} value="admin" />
                <span style={{ fontSize: 14 }}>管理者</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              backgroundColor: isLoading ? '#93c5fd' : '#1a56db',
              color: 'white',
              padding: '12px',
              border: 'none',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              marginTop: 8,
              transition: 'background 0.2s',
            }}
          >
            {isLoading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: '1.5rem' }}>
          不明な点は総務部（内線: 1234）までお問い合わせください
        </p>
      </div>
    </div>
  )
}
