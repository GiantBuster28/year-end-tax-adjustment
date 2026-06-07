import React, { useState, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAttachments, uploadAttachment, deleteAttachment } from '../../api/attachments'
import { useDeclaration } from '../../hooks/useDeclaration'
import { LoadingSpinner } from '../../components/LoadingSpinner'

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const getFileIcon = (fileType: string): string => {
  if (fileType.includes('pdf')) return '📄'
  if (fileType.includes('image')) return '🖼️'
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊'
  return '📎'
}

export const AttachmentUpload: React.FC = () => {
  const { declaration, isLoading: declLoading } = useDeclaration()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [uploadError, setUploadError] = useState('')

  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ['attachments', declaration?.id],
    queryFn: () => getAttachments(declaration!.id),
    enabled: !!declaration?.id,
  })

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }))
      const result = await uploadAttachment(declaration!.id, file, (progress) => {
        setUploadProgress((prev) => ({ ...prev, [file.name]: progress }))
      })
      return result
    },
    onSuccess: (_, file) => {
      queryClient.invalidateQueries({ queryKey: ['attachments', declaration?.id] })
      setUploadProgress((prev) => {
        const next = { ...prev }
        delete next[file.name]
        return next
      })
    },
    onError: () => {
      setUploadError('アップロードに失敗しました')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAttachment(declaration!.id, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attachments', declaration?.id] }),
  })

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || !declaration) return
      setUploadError('')
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          setUploadError(`${file.name}: ファイルサイズは10MB以下にしてください`)
          continue
        }
        await uploadMutation.mutateAsync(file)
      }
    },
    [declaration, uploadMutation]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles]
  )

  if (declLoading) return <LoadingSpinner fullPage />

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a3a5c', marginBottom: '1.5rem' }}>
        添付書類アップロード（SCR-014）
      </h2>

      <div
        style={{
          backgroundColor: 'white',
          borderRadius: 12,
          padding: '1.5rem',
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
          marginBottom: '1.5rem',
        }}
      >
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: '1rem' }}>
          アップロード可能なファイル: PDF, JPEG, PNG, Excel（各10MB以下）
        </p>

        {/* Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? '#1a56db' : '#d1d5db'}`,
            borderRadius: 10,
            padding: '3rem',
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: isDragging ? '#eff6ff' : '#f9fafb',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: '0.75rem' }}>📁</div>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#374151', margin: 0 }}>
            ファイルをドロップ または クリックして選択
          </p>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 6 }}>
            複数ファイルのアップロード可能
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls"
            onChange={(e) => handleFiles(e.target.files)}
            style={{ display: 'none' }}
          />
        </div>

        {uploadError && (
          <div
            style={{
              backgroundColor: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: 6,
              padding: '10px 14px',
              color: '#991b1b',
              fontSize: 13,
              marginTop: '1rem',
            }}
          >
            {uploadError}
          </div>
        )}

        {/* Upload Progress */}
        {Object.entries(uploadProgress).map(([name, progress]) => (
          <div key={name} style={{ marginTop: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 13, color: '#374151' }}>{name}</span>
              <span style={{ fontSize: 13, color: '#1a56db' }}>{progress}%</span>
            </div>
            <div style={{ height: 6, backgroundColor: '#e2e8f0', borderRadius: 3 }}>
              <div
                style={{
                  height: '100%',
                  backgroundColor: '#1a56db',
                  borderRadius: 3,
                  width: `${progress}%`,
                  transition: 'width 0.3s',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* File List */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: 12,
          padding: '1.5rem',
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
        }}
      >
        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1a3a5c', marginBottom: '1rem' }}>
          アップロード済みファイル ({attachments.length}件)
        </h3>

        {isLoading ? (
          <LoadingSpinner size="small" />
        ) : attachments.length === 0 ? (
          <p style={{ color: '#9ca3af', textAlign: 'center', padding: '1.5rem', fontSize: 14 }}>
            アップロードされたファイルがありません
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {attachments.map((att) => (
              <div
                key={att.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '10px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                }}
              >
                <span style={{ fontSize: 24 }}>{getFileIcon(att.file_type)}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, color: '#374151', margin: 0 }}>
                    {att.file_name}
                  </p>
                  <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>
                    {formatSize(att.file_size)} ・ {new Date(att.uploaded_at).toLocaleDateString('ja-JP')}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (confirm(`${att.file_name} を削除しますか？`)) {
                      deleteMutation.mutateAsync(att.id)
                    }
                  }}
                  style={{
                    padding: '4px 10px',
                    border: '1px solid #fca5a5',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 12,
                    backgroundColor: '#fee2e2',
                    color: '#991b1b',
                  }}
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
