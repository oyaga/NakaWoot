'use client'

import { useEffect } from 'react'
import { useRealtime } from '@/hooks/useRealtime'
import { useConversationStore, Message, ConversationSummary } from '@/store/useConversationStore'
import { useAuthStore } from '@/store/useAuthStore'
import { toast } from 'sonner'

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuthStore()
  const {
    addMessage,
    updateConversation,
    addConversation,
    removeConversation,
    removeConversationsByInbox,
    fetchConversations
  } = useConversationStore()

  useRealtime({
    onEvent: (event) => {

      switch (event.type) {
        case 'message.new':
          addMessage(event.payload as Message)
          break

        case 'conversation.updated':
          updateConversation(event.payload as ConversationSummary)
          break

        case 'conversation.new':
          addConversation(event.payload as ConversationSummary)
          // Também refetch para garantir que temos todos os dados
          fetchConversations()
          break

        case 'conversation.deleted':
          const deletedPayload = event.payload as { id: number }
          const deletedId = typeof deletedPayload === 'object' && deletedPayload !== null
            ? deletedPayload.id
            : Number(deletedPayload)
          removeConversation(deletedId)
          toast.success('Conversa deletada com sucesso')
          break

        case 'inbox.cleared':
          const inboxPayload = event.payload as { inbox_id: number; count: number }
          if (typeof inboxPayload === 'object' && inboxPayload !== null) {
            const inboxId = inboxPayload.inbox_id
            const count = inboxPayload.count || 0
            removeConversationsByInbox(Number(inboxId))
            toast.success(`${count} conversa(s) removida(s) da inbox`)
          }
          break

        default:
      }
    },
  })

  // Fetch inicial das conversas quando o usuário loga
  useEffect(() => {
    if (session) {
      fetchConversations()
    }
  }, [session, fetchConversations])

  return <>{children}</>
}
