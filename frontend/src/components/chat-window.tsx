'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useConversationStore } from '@/store/useConversationStore'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChatActivity } from './chat-activity'
import { cn } from '@/lib/utils'

export function ChatWindow() {
const { activeConversation, messages, activities } = useConversationStore()
const activeConv = activeConversation
const scrollRef = useRef<HTMLDivElement>(null)
const lastMessageCountRef = useRef(0)

// Filtrar mensagens apenas da conversa ativa (memoizado para performance)
const conversationMessages = useMemo(() => {
  if (!activeConv) return []
  const filtered = messages.filter(m => m.conversation_id === activeConv.id)
  return filtered
}, [messages, activeConv])

// Unificar e ordenar por data para criar a Timeline Real
const timeline = useMemo(() => {
  const combined = [
    ...conversationMessages.map(m => ({ ...m, type: 'message' })),
    ...activities.map(a => ({ ...a, type: 'activity' }))
  ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  return combined
}, [conversationMessages, activities])

// Auto-scroll para a última mensagem quando:
// 1. A conversa muda (activeConv.id)
// 2. Novas mensagens chegam (timeline.length aumenta)
useEffect(() => {
  const scrollToBottom = () => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }

  // Delay para garantir que o DOM foi atualizado
  const timeoutId = setTimeout(scrollToBottom, 100)

  return () => clearTimeout(timeoutId)
}, [activeConv?.id, timeline.length])

// Log quando o componente re-renderiza
useEffect(() => {
  lastMessageCountRef.current = conversationMessages.length
}, [activeConv?.id, conversationMessages.length])

if (!activeConv) return <div className="flex-1 flex items-center justify-center text-muted-foreground">Selecione uma conversa</div>

return (
<div className="flex-1 flex flex-col bg-white">
<header className="h-16 border-b border-border px-6 flex items-center justify-between shrink-0 bg-white z-10">
<div className="flex flex-col">
<h3 className="font-bold text-foreground">{activeConv.contact.name}</h3>
<p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">#{activeConv.display_id}</p>
</div>
</header>

<ScrollArea ref={scrollRef} className="flex-1 p-6 bg-background/20 /50">
<div className="space-y-4">
{timeline.map((item: any, idx) => {
if (item.type === 'activity') {
return (
<ChatActivity
key={`act-${idx}`}
type={item.activity_type}
userName={item.user?.name}
createdAt={item.created_at}
metadata={item.metadata}
/>
)
}

return (
<div key={`msg-${item.id}`} className={cn("flex", item.message_type === 1 ? "justify-end" : "justify-start")}>
<div className={cn(
"max-w-[70%] rounded-2xl px-4 py-2 text-sm shadow-sm border",
item.message_type === 1
? "bg-primary text-white border-primary rounded-tr-none"
: "bg-white text-foreground  border-border rounded-tl-none"
)}>
{/* Renderizar mídia se existir */}
{item.media_url && (
<div className="mb-2">
{item.content_type === 'image' || item.mime_type?.startsWith('image/') ? (
<img
  src={item.media_url}
  alt={item.file_name || 'Image'}
  referrerPolicy="no-referrer"
  className="rounded-lg max-w-full h-auto max-h-96 object-contain"
  onError={(e) => {
    e.currentTarget.style.display = 'none'
    // Opcional: mostrar um fallback
    e.currentTarget.parentElement?.insertAdjacentHTML('beforeend', '<div class="p-4 bg-muted text-muted-foreground text-sm rounded-lg flex items-center justify-center">Imagem indisponível</div>')
  }}
/>
) : item.content_type === 'video' || item.mime_type?.startsWith('video/') ? (
<video
  src={item.media_url}
  controls
  className="rounded-lg max-w-full h-auto max-h-96"
>
  Seu navegador não suporta vídeo.
</video>
) : item.content_type === 'audio' || item.mime_type?.startsWith('audio/') ? (
<audio
  src={item.media_url}
  controls
  className="w-full"
>
  Seu navegador não suporta áudio.
</audio>
) : (
<a
  href={item.media_url}
  target="_blank"
  rel="noopener noreferrer"
  className={cn(
    "flex items-center gap-2 p-2 rounded hover:opacity-80",
    item.message_type === 1 ? "text-foreground" : "text-primary"
  )}
>
  <span className="text-xs">📎 {item.file_name || 'Arquivo'}</span>
</a>
)}
</div>
)}
{item.content}
</div>
</div>
)
})}
</div>
</ScrollArea>
{/* Footer omitido... */}
</div>
)
}