import React from 'react'

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large'
  fullPage?: boolean
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  fullPage = false,
}) => {
  const sizeMap = { small: 24, medium: 40, large: 64 }
  const px = sizeMap[size]

  const spinner = (
    <div
      style={{
        width: px,
        height: px,
        border: `${px / 8}px solid #e2e8f0`,
        borderTop: `${px / 8}px solid #1a56db`,
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }}
    />
  )

  if (fullPage) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255,255,255,0.8)',
          zIndex: 9999,
        }}
      >
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        {spinner}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      {spinner}
    </div>
  )
}
