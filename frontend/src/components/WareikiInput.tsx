import React from 'react'
import { toWareki } from '../hooks/useWareki'

interface WareikiInputProps {
  value: string
  onChange: (value: string) => void
  label?: string
  required?: boolean
  error?: string
  name?: string
  id?: string
}

export const WareikiInput: React.FC<WareikiInputProps> = ({
  value,
  onChange,
  label,
  required,
  error,
  name,
  id,
}) => {
  const wareki = toWareki(value)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && (
        <label
          htmlFor={id || name}
          style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}
        >
          {label}
          {required && <span style={{ color: '#ef4444', marginLeft: 4 }}>*</span>}
        </label>
      )}
      <input
        type="date"
        id={id || name}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        style={{
          padding: '8px 12px',
          border: `1px solid ${error ? '#ef4444' : '#d1d5db'}`,
          borderRadius: 6,
          fontSize: 14,
          color: '#1f2937',
          outline: 'none',
          width: '100%',
        }}
      />
      {wareki && (
        <span style={{ fontSize: 13, color: '#1a56db', fontWeight: 500 }}>{wareki}</span>
      )}
      {error && <span style={{ fontSize: 12, color: '#ef4444' }}>{error}</span>}
    </div>
  )
}
