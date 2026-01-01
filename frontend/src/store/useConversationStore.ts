import { create } from 'zustand'
import api from '@/lib/api'

interface Contact {
id: number
name: string
avatar_url: string
email: string
phone_number: string
custom_attributes: Record<string, unknown> // Migration 32
additional_attributes: Record<string, unknown>
}

export interface ConversationSummary {
id: number
display_id: number
status: number
last_message_content: string
last_message_at: string
contact: Contact // Agora aninhado ou mapeado via View
inbox_name: string
unread_count: number
}

export interface Message {
id: number
conversation_id: number
content: string
message_type: number
status: string // sent, delivered, read, failed
created_at: string
content_type?: string
media_url?: string
file_name?: string
mime_type?: string
}

interface Activity {
  id: number
  activity_type: string
  user?: { name: string }
  created_at: string
  metadata?: Record<string, unknown>
}

interface ConversationState {
conversations: ConversationSummary[]
activeConversation: ConversationSummary | null
messages: Message[]
activities: Activity[]
isLoading: boolean
fetchConversations: () => Promise<void>
selectConversation: (conv: ConversationSummary) => Promise<void>
sendMessage: (content: string) => Promise<void>
// Realtime updates
addMessage: (message: Message) => void
updateConversation: (conversation: ConversationSummary) => void
addConversation: (conversation: ConversationSummary) => void
removeConversation: (conversationId: number) => void
removeConversationsByInbox: (inboxId: number) => void
}

export const useConversationStore = create<ConversationState>((set, get) => ({
conversations: [],
activeConversation: null,
messages: [],
activities: [],
isLoading: false,

fetchConversations: async () => {
set({ isLoading: true })
try {
const response = await api.get('/conversations')
set({ conversations: response.data })
} finally {
set({ isLoading: false })
}
},

selectConversation: async (conv) => {
set({ activeConversation: conv, messages: [] })
try {
const response = await api.get(`/conversations/${conv.id}/messages`)
set({ messages: response.data.reverse() })
} catch (error) {
console.error("Erro ao carregar mensagens:", error)
}
},

sendMessage: async (content) => {
const { activeConversation } = get()
if (!activeConversation) return

try {
// O Backend Go agora coordenará com a Evolution API
const response = await api.post(`/conversations/${activeConversation.id}/messages`, {
content,
message_type: 1 // Outgoing
})

set((state) => ({
messages: [...state.messages, response.data]
}))
} catch (error) {
console.error("Erro no envio coordenado:", error)
throw error
}
},

// Realtime update handlers
addMessage: (message) => {
const { messages } = get()
// Sempre adicionar a mensagem (componentes filtram por conversation_id)
// Verificar se a mensagem já não existe (evitar duplicatas)
const exists = messages.some(m => m.id === message.id)
if (!exists) {
set((state) => ({
messages: [...state.messages, message]
}))
}
},

updateConversation: (conversation) => {
set((state) => {
const index = state.conversations.findIndex(c => c.id === conversation.id)
if (index !== -1) {
const updated = [...state.conversations]
// Remove da posição atual
updated.splice(index, 1)
// Adiciona no topo (nova mensagem = primeiro da lista)
updated.unshift(conversation)
return { conversations: updated }
}
return state
})
},

addConversation: (conversation) => {
set((state) => {
// Verificar se já não existe
const exists = state.conversations.some(c => c.id === conversation.id)
if (!exists) {
return { conversations: [conversation, ...state.conversations] }
}
return state
})
},

removeConversation: (conversationId) => {
set((state) => {
const filtered = state.conversations.filter(c => c.id !== conversationId)

// Se a conversa ativa foi deletada, limpar seleção
const newActiveConversation = state.activeConversation?.id === conversationId
  ? null
  : state.activeConversation

return {
conversations: filtered,
activeConversation: newActiveConversation,
messages: newActiveConversation ? state.messages : []
}
})
},

removeConversationsByInbox: (inboxId) => {
set((state) => {
// Filtrar conversas que não pertencem a esta inbox
const filtered = state.conversations.filter(c => c.inbox_name !== inboxId.toString())

// Se a conversa ativa pertencia à inbox deletada, limpar seleção
const activeConvBelongsToInbox = state.activeConversation &&
  state.conversations.find(c => c.id === state.activeConversation!.id)?.inbox_name === inboxId.toString()

return {
conversations: filtered,
activeConversation: activeConvBelongsToInbox ? null : state.activeConversation,
messages: activeConvBelongsToInbox ? [] : state.messages
}
})
}
}))