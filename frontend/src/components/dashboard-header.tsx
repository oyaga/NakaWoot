'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
DropdownMenu,
DropdownMenuContent,
DropdownMenuItem,
DropdownMenuLabel,
DropdownMenuSeparator,
DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export function DashboardHeader() {
const { user, profile, fetchProfile, isLoading } = useAuthStore()
const router = useRouter()

useEffect(() => {
if (user && !profile) {
fetchProfile()
}
}, [user, profile, fetchProfile])

const handleLogout = async () => {
await supabase.auth.signOut()
router.push('/login')
}

return (
<header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
<div className="flex items-center gap-2">
<h2 className="text-lg font-semibold text-slate-800">Dashboard</h2>
{isLoading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
</div>

<div className="flex items-center gap-4">
<DropdownMenu>
<DropdownMenuTrigger asChild>
<Button variant="ghost" className="relative h-10 w-10 rounded-full border border-slate-100">
<Avatar>
<AvatarImage src={profile?.avatar_url || user?.user_metadata?.avatar_url} />
<AvatarFallback className="bg-blue-50 text-blue-700 font-bold">
{profile?.name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
</AvatarFallback>
</Avatar>
</Button>
</DropdownMenuTrigger>
<DropdownMenuContent align="end" className="w-56">
<DropdownMenuLabel className="font-normal">
<div className="flex flex-col space-y-1">
<p className="text-sm font-medium leading-none">{profile?.name || 'Usuário'}</p>
<p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
</div>
</DropdownMenuLabel>
<DropdownMenuSeparator />
<DropdownMenuItem className="text-xs text-slate-500">
Conta ID: {profile?.account_id || 'Carregando...'}
</DropdownMenuItem>
<DropdownMenuSeparator />
<DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:bg-red-50 focus:text-red-600 cursor-pointer">
Sair
</DropdownMenuItem>
</DropdownMenuContent>
</DropdownMenu>
</div>
</header>
)
}