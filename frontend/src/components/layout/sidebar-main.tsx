"use client";

import React from 'react';
import {
MessageSquare,
Users,
Settings,
LogOut,
UserCircle
} from 'lucide-react';
import { cn } from "@/lib/utils";
import {
Tooltip,
TooltipContent,
TooltipProvider,
TooltipTrigger
} from "@/components/ui/tooltip";
import { useAuthStore } from '@/store/useAuthStore';

const navItems = [
{ icon: MessageSquare, label: 'Conversas', href: '/conversations' },
{ icon: Users, label: 'Contatos', href: '/contacts' },
{ icon: Settings, label: 'Configurações', href: '/settings' },
];

export function SidebarMain() {
const logout = useAuthStore((state) => state.logout);

return (
<aside className="w-16 flex flex-col items-center py-4 bg-slate-900 text-white border-r border-border">
<div className="mb-8">
<div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xl">
N
</div>
</div>

<TooltipProvider delayDuration={0}>
<nav className="flex flex-1 flex-col gap-4">
{navItems.map((item) => (
<Tooltip key={item.label}>
<TooltipTrigger asChild>
<button className={cn(
"p-3 rounded-xl transition-colors hover:bg-slate-800 text-slate-400 hover:text-white"
)}>
<item.icon size={24} />
</button>
</TooltipTrigger>
<TooltipContent side="right">
{item.label}
</TooltipContent>
</Tooltip>
))}
</nav>

<div className="mt-auto flex flex-col gap-4 items-center">
<Tooltip>
<TooltipTrigger asChild>
<button
onClick={() => logout()}
className="p-3 rounded-xl transition-colors hover:bg-red-900/20 text-slate-400 hover:text-red-500"
>
<LogOut size={24} />
</button>
</TooltipTrigger>
<TooltipContent side="right">Sair</TooltipContent>
</Tooltip>

<div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
<UserCircle size={28} className="text-slate-300" />
</div>
</div>
</TooltipProvider>
</aside>
);
}