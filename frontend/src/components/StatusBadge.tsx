import React from 'react'
import { DeclarationStatus } from '../types'

interface StatusBadgeProps {
  status: DeclarationStatus
}

const statusConfig: Record<DeclarationStatus, { label: string; bg: string; color: string }> = {
  draft: { label: '下書き', bg: '#f1f5f9', color: '#64748b' },
  submitted: { label: '提出済み', bg: '#dbeafe', color: '#1d4ed8' },
  under_review: { label: '審査中', bg: '#fef3c7', color: '#d97706' },
  approved: { label: '承認済み', bg: '#d1fae5', color: '#065f46' },
  rejected: { label: '差し戻し', bg: '#fee2e2', color: '#991b1b' },
  calculated: { label: '計算完了', bg: '#e0f2fe', color: '#0369a1' },
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = statusConfig[status] || statusConfig.draft

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
        backgroundColor: config.bg,
        color: config.color,
        whiteSpace: 'nowrap',
      }}
    >
      {config.label}
    </span>
  )
}
