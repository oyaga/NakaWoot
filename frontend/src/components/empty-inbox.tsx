import { MessageCircle } from 'lucide-react';

export function EmptyInbox() {
return (
<div className="flex-1 flex flex-col items-center justify-center bg-background text-muted-foreground p-8 text-center">
<div className="w-16 h-16 bg-card rounded-2xl shadow-sm flex items-center justify-center mb-4 border border-slate-100">
<MessageCircle size={32} className="text-blue-500" />
</div>
<h3 className="text-foreground font-semibold mb-1">Nenhuma conversa encontrada</h3>
<p className="text-sm max-w-xs">
Parece que você está em dia com seus atendimentos. Novas conversas aparecerão aqui automaticamente.
</p>
</div>
);
}