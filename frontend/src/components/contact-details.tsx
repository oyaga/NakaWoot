import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Mail, Phone, Globe, Info } from 'lucide-react';

import { useConversationStore } from '@/store/useConversationStore';

export function ContactDetails() {
  const { activeConversation } = useConversationStore();
  const contact = activeConversation?.contact;

  if (!contact) return <div className="w-80 border-l bg-card"></div>;

  return (
    <div className="w-80 border-l bg-card flex flex-col h-full overflow-y-auto">
      <div className="p-6 flex flex-col items-center text-center border-b">
        <Avatar className="h-20 w-20 mb-4">
          <AvatarFallback className="text-2xl">{contact.name?.[0]}</AvatarFallback>
        </Avatar>
        <h2 className="font-bold text-lg">{contact.name}</h2>
        <p className="text-sm text-muted-foreground">{contact.email}</p>
      </div>

<Accordion type="single" collapsible className="w-full">
<AccordionItem value="info">
<AccordionTrigger className="px-4 text-xs font-semibold uppercase text-muted-foreground">
Informações de Contato
</AccordionTrigger>
<AccordionContent className="px-4 space-y-3">
<div className="flex items-center space-x-2 text-sm">
<Mail size={14} className="text-muted-foreground" />
<span>joao@email.com</span>
</div>
<div className="flex items-center space-x-2 text-sm">
<Phone size={14} className="text-muted-foreground" />
<span>+55 11 99999-9999</span>
</div>
</AccordionContent>
</AccordionItem>

<AccordionItem value="attributes">
<AccordionTrigger className="px-4 text-xs font-semibold uppercase text-muted-foreground">
Atributos Customizados
</AccordionTrigger>
<AccordionContent className="px-4">
<div className="bg-background p-2 rounded text-[11px] font-mono">
{"{ \"plan\": \"pro\", \"source\": \"whatsapp\" }"}
</div>
</AccordionContent>
</AccordionItem>
</Accordion>
</div>
);
}