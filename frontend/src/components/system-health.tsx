'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { Activity, Database, Server } from 'lucide-react'
import { cn } from '@/lib/utils'

export function SystemHealth() {
const [health, setHealth] = useState<{ status: string; database: string } | null>(null)

useEffect(() => {
const checkHealth = async () => {
try {
const res = await api.get('/health')
setHealth(res.data)
} catch (e) {
setHealth({ status: 'offline', database: 'offline' })
}
}
checkHealth()
const interval = setInterval(checkHealth, 30000) // 30s
return () => clearInterval(interval)
}, [])

if (!health) return null

const isOperational = health.status === 'operational' && health.database === 'online'

return (
<div className="px-4 py-2 mt-auto border-t border-slate-800">
<div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-2">
<span>Sistema NK</span>
<Activity className={cn("h-3 w-3", isOperational ? "text-green-500" : "text-red-500 animate-pulse")} />
</div>
<div className="space-y-1">
<div className="flex items-center gap-2 text-[10px] text-slate-400">
<Server className="h-3 w-3" />
<span>API: {health.status === 'operational' ? 'OK' : 'FAIL'}</span>
</div>
<div className="flex items-center gap-2 text-[10px] text-slate-400">
<Database className="h-3 w-3" />
<span>DB: {health.database === 'online' ? 'CONNECTED' : 'DISCONNECTED'}</span>
</div>
</div>
</div>
)
}