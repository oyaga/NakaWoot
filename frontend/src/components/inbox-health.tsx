'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { Battery, Wifi, WifiOff, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Health {
is_online: boolean
battery_level: number
inbox_id: number
}

export function InboxHealth({ inboxId }: { inboxId: number }) {
const [health, setHealth] = useState<Health | null>(null)

useEffect(() => {
const fetchHealth = async () => {
try {
const res = await api.get(`/inboxes/${inboxId}/status`)
setHealth(res.data)
} catch (e) {
console.error("Erro ao buscar saúde da inbox")
}
}
fetchHealth()
const interval = setInterval(fetchHealth, 60000) // 1 min
return () => clearInterval(interval)
}, [inboxId])

if (!health) return null

return (
<div className="flex items-center gap-3 px-3 py-2 bg-secondary/50 rounded-lg border border-border">
<div className="flex flex-col">
<span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">WhatsApp</span>
<div className="flex items-center gap-1.5">
{health.is_online ? (
<Wifi className="h-3 w-3 text-foreground0" />
) : (
<WifiOff className="h-3 w-3 text-red-500 animate-pulse" />
)}
<span className={cn(
"text-[10px] font-bold",
health.is_online ? "text-muted-foreground" : "text-red-400"
)}>
{health.is_online ? 'CONECTADO' : 'OFFLINE'}
</span>
</div>
</div>

<div className="ml-auto flex items-center gap-1 text-muted-foreground">
<Battery className={cn(
"h-4 w-4",
health.battery_level < 20 ? "text-red-500" : "text-foreground0"
)} />
<span className="text-[10px] font-mono">{health.battery_level}%</span>
</div>
</div>
)
}