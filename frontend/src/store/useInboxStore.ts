import { create } from 'zustand'
import api from '@/lib/api'

interface Inbox {
id: number
name: string
channel_type: string
}

interface InboxState {
inboxes: Inbox[]
isLoading: boolean
  fetchInboxes: () => Promise<void>
}

export const useInboxStore = create<InboxState>((set) => ({
inboxes: [],
isLoading: false,
fetchInboxes: async () => {
set({ isLoading: true })
try {
const response = await api.get(`/inboxes`)
// Suporta formato Chatwoot { payload: [...] } e formato direto [...]
const inboxes = response.data.payload || response.data
set({ inboxes })
} catch (error) {
console.error('Erro ao buscar inboxes:', error)
} finally {
set({ isLoading: false })
}
},
}))