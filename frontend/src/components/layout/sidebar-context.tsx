"use client";

import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Inbox, CheckCircle2, Clock } from 'lucide-react';
import { AccountSelector } from './account-selector';

const sections = [
{ label: 'Minhas Conversas', icon: Inbox, count: 5 },
{ label: 'Aguardando', icon: Clock, count: 12 },
{ label: 'Resolvidos', icon: CheckCircle2, count: 0 },
];

export function SidebarContext() {
return (
<aside className="w-64 border-r border-border bg-background flex flex-col">
{/* Seletor de Conta (Empresa) */}
<div className="p-4 border-b border-border bg-card">
<AccountSelector />
</div>

<ScrollArea className="flex-1">
<div className="p-3 space-y-1">
{sections.map((item) => (
<button
key={item.label}
className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200 active:bg-accent/80"
>
<div className="flex items-center gap-3">
<item.icon size={18} />
{item.label}
</div>
{item.count > 0 && (
<span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px] font-bold">
{item.count}
</span>
)}
</button>
))}
</div>

<div className="mt-6 px-4">
<h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2">Canais</h3>
<div className="mt-3 space-y-1">
<div className="text-xs text-muted-foreground italic px-3 py-2">
Nenhum canal ativo
</div>
</div>
</div>
</ScrollArea>
</aside>
);
}