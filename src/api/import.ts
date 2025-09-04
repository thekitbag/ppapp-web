import { api } from './client'

export async function importTrello(file: File): Promise<{ imported: number; skipped: number }> {
  const formData = new FormData()
  formData.append('file', file)
  
  const { data } = await api.post('/import/trello', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  
  return data as { imported: number; skipped: number }
}