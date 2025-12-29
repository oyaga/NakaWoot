'use client';

import { Inbox, User, Users } from 'lucide-react';

interface InboxNavProps {
activeTab: 'mine' | 'unassigned' | 'all';
onTabChange: (tab: 'mine' | 'unassigned' | 'all') => void;
}

export function InboxNav({ activeTab, onTabChange }: InboxNavProps) {
const tabs = [
{ id: 'mine', label: 'Minhas', icon: User },
{ id: 'unassigned', label: 'Não atribuídas', icon: Inbox },
{ id: 'all', label: 'Todas', icon: Users },
] as const;

return (
<div className="flex border-b">
{tabs.map((tab) => (
<button
key={tab.id}
onClick={() => onTabChange(tab.id)}
className={`flex-1 flex items-center justify-center space-x-2 py-3 text-xs font-medium transition-colors border-b-2 ${
activeTab === tab.id
? 'border-blue-600 text-blue-600 bg-blue-50/50'
: 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
}`}
>
<tab.icon size={14} />
<span>{tab.label}</span>
</button>
))}
</div>
);
}