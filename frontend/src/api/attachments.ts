import client from './client'
import { Attachment } from '../types'

export const getAttachments = async (declarationId: number): Promise<Attachment[]> => {
  const { data } = await client.get<Attachment[]>(`/declarations/${declarationId}/attachments`)
  return data
}

export const uploadAttachment = async (
  declarationId: number,
  file: File,
  onProgress?: (progress: number) => void
): Promise<Attachment> => {
  const formData = new FormData()
  formData.append('file', file)

  const { data } = await client.post<Attachment>(
    `/declarations/${declarationId}/attachments`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(progress)
        }
      },
    }
  )
  return data
}

export const deleteAttachment = async (
  declarationId: number,
  attachmentId: number
): Promise<void> => {
  await client.delete(`/declarations/${declarationId}/attachments/${attachmentId}`)
}

export const downloadAttachment = async (
  declarationId: number,
  attachmentId: number
): Promise<Blob> => {
  const { data } = await client.get(
    `/declarations/${declarationId}/attachments/${attachmentId}/download`,
    { responseType: 'blob' }
  )
  return data
}
