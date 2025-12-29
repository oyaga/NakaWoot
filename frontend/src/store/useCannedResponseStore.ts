import { create } from 'zustand'
import api from '@/lib/api'

interface CannedResponse {
id: number
short_code: string
content: string
}

interface CannedState {
responses: CannedResponse[]
isLoading: boolean
fetchResponses: () => Promise<void>
addResponse: (shortCode: string, content: string) => Promise<void>
}

export const useCannedResponseStore = create<CannedState>((set) => ({
responses: [],
isLoading: false,
fetchResponses: async () => {
set({ isLoading: true })
try {
const response = await api.get('/canned_responses')
set({ responses: response.data })
} finally {
set({ isLoading: false })
}
},
addResponse: async (shortCode, content) => {
try {
const response = await api.post('/canned_responses', { short_code: shortCode, content })
set((state) => ({ responses: [...state.responses, response.data] }))
} catch (error) {
console.error("Erro ao criar resposta rápida:", error)
}
}
}))