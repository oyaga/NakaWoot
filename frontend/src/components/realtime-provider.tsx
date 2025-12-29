'use client'

import { useEffect } from 'react'
import { useRealtime } from '@/hooks/useRealtime'
import { useConversationStore, Message, ConversationSummary } from '@/store/useConversationStore'
import { useAuthStore } from '@/store/useAuthStore'

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuthStore()
  const { addMessage, updateConversation, addConversation, fetchConversations } = useConversationStore()

  useRealtime({
    onEvent: (event) => {
      console.log('[RealtimeProvider] Received event:', event.type)

      switch (event.type) {
        case 'message.new':
          console.log('[RealtimeProvider] New message:', event.payload)
          addMessage(event.payload as Message)
          break

        case 'conversation.updated':
          console.log('[RealtimeProvider] Conversation updated:', event.payload)
          updateConversation(event.payload as ConversationSummary)
          break

        case 'conversation.new':
          console.log('[RealtimeProvider] New conversation:', event.payload)
          addConversation(event.payload as ConversationSummary)
          // Também refetch para garantir que temos todos os dados
          fetchConversations()
          break

        default:
          console.log('[RealtimeProvider] Unhandled event type:', event.type)
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
