
import { useAuthStore } from '@/store/useAuthStore'

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const session = useAuthStore.getState().session
  const token = session?.access_token

  // Pega URL base do env ou default
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4120')
  const url = `${baseUrl}${endpoint}`

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  // Se for 401, talvez logout?
  if (response.status === 401) {
    // useAuthStore.getState().logout() // Cuidado com loops
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}))
    throw new Error(errorBody.message || `API Error: ${response.statusText}`)
  }

  // Se não tiver conteúdo (204), retorna null
  if (response.status === 204) return null

  return response.json()
}
