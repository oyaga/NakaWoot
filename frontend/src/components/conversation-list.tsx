'use client'

import { useConversationStore } from '@/store/useConversationStore'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { User } from 'lucide-react'

export function ConversationList() {
  const { conversations, selectConversation, activeConversation } = useConversationStore()
  const activeConversationId = activeConversation?.id

return (
<div className="flex-1 overflow-y-auto bg-white">
{conversations.map((conv) => (
<div
key={conv.id}
onClick={() => selectConversation(conv)}
className={cn(
"p-4 cursor-pointer hover:bg-slate-50 flex flex-col gap-2 border-b border-slate-100 transition-all",
activeConversationId === conv.id && "bg-blue-50/50 border-l-4 border-l-blue-600"
)}
>
<div className="flex items-start gap-3">
<Avatar className="h-10 w-10 border border-slate-200">
<AvatarImage src={conv.contact.avatar_url} />
<AvatarFallback>{conv.contact.name?.charAt(0)}</AvatarFallback>
</Avatar>
<div className="flex-1 min-w-0">
<div className="flex justify-between items-baseline">
<h4 className="text-sm font-bold truncate text-slate-900">{conv.contact.name}</h4>
<span className="text-[10px] text-slate-400">#{conv.display_id}</span>
</div>
<p className="text-xs text-slate-500 truncate">{conv.last_message_content}</p>
</div>
</div>

{/* Footer do Item (Assignee & Meta) */}
<div className="flex items-center justify-between mt-1">
<div className="flex items-center gap-1.5">
<Badge variant="outline" className="text-[9px] py-0 h-4 border-slate-200 text-slate-500 bg-slate-50">
{conv.inbox_name}
</Badge>
{conv.unread_count > 0 && (
<Badge className="bg-blue-600 text-[9px] h-4 px-1 rounded-full">{conv.unread_count}</Badge>
)}
</div>

{/* Responsável (Assignee V3) */}
<div className="flex items-center gap-1">
<User className="h-3 w-3 text-slate-300" />
<span className={cn(
"text-[10px] font-medium",
"text-orange-400 italic" // Fallback simplified
)}>
{'Sem agente'}
</span>
</div>
</div>
</div>
))}
</div>
)
}