'use client';

import { useState } from 'react';
import { Send, Paperclip, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';

export function ChatBox({ conversation }: { conversation: any }) {
const [message, setMessage] = useState('');

const handleSendMessage = () => {
if (!message.trim()) return;

// Placeholder para chamada de API Go
toast.success('Mensagem enviada (Simulação)');
setMessage('');
};

return (
<div className="flex-1 flex flex-col bg-background/50">
<header className="h-16 border-b bg-card flex items-center px-6 justify-between shadow-sm">
<div className="flex items-center space-x-3">
<Avatar className="h-8 w-8">
<AvatarFallback>{conversation.contact.name[0]}</AvatarFallback>
</Avatar>
<div>
<span className="font-semibold text-sm block">{conversation.contact.name}</span>
<span className="text-[10px] text-foreground0 font-medium">Ativo agora</span>
</div>
</div>
<div className="flex space-x-2">
<Button variant="outline" size="sm" className="text-xs">Transferir</Button>
<Button size="sm" className="text-xs bg-primary hover:bg-primary/90">Resolver</Button>
</div>
</header>

<ScrollArea className="flex-1 p-6">
<div className="space-y-4 max-w-4xl mx-auto">
<div className="flex justify-start">
<div className="bg-card border rounded-2xl rounded-tl-none p-4 max-w-[70%] text-sm shadow-sm leading-relaxed">
{conversation.last_message}
</div>
</div>
</div>
</ScrollArea>

<footer className="p-4 bg-card border-t border-border">
<div className="max-w-4xl mx-auto flex items-end space-x-2">
<div className="flex-1 bg-accent rounded-xl p-2 flex items-center space-x-2 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
<Button variant="ghost" size="icon" className="text-muted-foreground h-8 w-8">
<Paperclip size={18} />
</Button>
<Input
placeholder="Escreva uma mensagem..."
className="border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-sm"
value={message}
onChange={(e) => setMessage(e.target.value)}
onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
autoComplete="off"
/>
<Button variant="ghost" size="icon" className="text-muted-foreground h-8 w-8">
<Smile size={18} />
</Button>
</div>
<Button onClick={handleSendMessage} size="icon" className="rounded-xl h-10 w-10 bg-primary hover:bg-primary shrink-0">
<Send size={18} />
</Button>
</div>
</footer>
</div>
);
}