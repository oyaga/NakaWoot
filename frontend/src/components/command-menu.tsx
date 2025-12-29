'use client';

import { useEffect, useState } from 'react';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { MessageSquare, Settings, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function CommandMenu() {
const [open, setOpen] = useState(false);
const router = useRouter();

useEffect(() => {
const down = (e: KeyboardEvent) => {
if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
e.preventDefault();
setOpen((open) => !open);
}
};
document.addEventListener("keydown", down);
return () => document.removeEventListener("keydown", down);
}, []);

return (
<CommandDialog open={open} onOpenChange={setOpen}>
<CommandInput placeholder="Digite um comando ou busque..." />
<CommandList>
<CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
<CommandGroup heading="Atalhos">
<CommandItem onSelect={() => router.push('/dashboard')}>
<MessageSquare className="mr-2 h-4 w-4" />
<span>Conversas</span>
</CommandItem>
<CommandItem onSelect={() => router.push('/dashboard/settings')}>
<Settings className="mr-2 h-4 w-4" />
<span>Configurações</span>
</CommandItem>
</CommandGroup>
</CommandList>
</CommandDialog>
);
}