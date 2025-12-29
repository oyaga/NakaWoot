'use client'

import { useConversationStore } from '@/store/useConversationStore'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChatActivity } from './chat-activity'
import { cn } from '@/lib/utils'

export function ChatWindow() {
const { activeConversation, messages, activities } = useConversationStore()
const activeConv = activeConversation

if (!activeConv) return <div className="flex-1 flex items-center justify-center text-slate-400">Selecione uma conversa</div>

// Unificar e ordenar por data para criar a Timeline Real
const timeline = [
...messages.map(m => ({ ...m, type: 'message' })),
...activities.map(a => ({ ...a, type: 'activity' }))
].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

return (
<div className="flex-1 flex flex-col bg-white">
<header className="h-16 border-b border-slate-200 px-6 flex items-center justify-between shrink-0 bg-white z-10">
<div className="flex flex-col">
<h3 className="font-bold text-slate-900">{activeConv.contact.name}</h3>
<p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">#{activeConv.display_id}</p>
</div>
</header>

<ScrollArea className="flex-1 p-6 bg-slate-50/20">
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
? "bg-blue-600 text-white border-blue-700 rounded-tr-none"
: "bg-white text-slate-900 border-slate-200 rounded-tl-none"
)}>
{/* Renderizar mídia se existir */}
{item.media_url && (
<div className="mb-2">
{item.content_type === 'image' || item.mime_type?.startsWith('image/') ? (
<img
  src={item.media_url}
  alt={item.file_name || 'Image'}
  className="rounded-lg max-w-full h-auto max-h-96 object-contain"
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
    item.message_type === 1 ? "text-white" : "text-blue-600"
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