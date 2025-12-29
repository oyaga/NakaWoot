import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function ConversationFilters() {
return (
<div className="px-4 pb-2">
<Tabs defaultValue="open" className="w-full">
<TabsList className="grid w-full grid-cols-3 h-8">
<TabsTrigger value="open" className="text-[10px]">Abertas</TabsTrigger>
<TabsTrigger value="pending" className="text-[10px]">Pendentes</TabsTrigger>
<TabsTrigger value="resolved" className="text-[10px]">Resolvidas</TabsTrigger>
</TabsList>
</Tabs>
</div>
);
}