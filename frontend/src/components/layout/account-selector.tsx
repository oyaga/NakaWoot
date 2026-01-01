"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
Command,
CommandEmpty,
CommandGroup,
CommandInput,
CommandItem,
CommandList,
} from "@/components/ui/command";
import {
Popover,
PopoverContent,
PopoverTrigger,
} from "@/components/ui/popover";
import { useAuthStore } from "@/store/useAuthStore";

interface Account {
  id: number
  name: string
  settings?: Record<string, unknown>
}

export function AccountSelector() {
const [open, setOpen] = React.useState(false);
const { currentAccount, setCurrentAccount, user } = useAuthStore();

// Extrai as contas das relações AccountUser
const accounts = user?.account_users?.map(au => au.account).filter(Boolean) || [];

return (
<Popover open={open} onOpenChange={setOpen}>
<PopoverTrigger asChild>
<Button
variant="outline"
role="combobox"
aria-expanded={open}
className="w-full justify-between bg-card border-border hover:bg-background text-foreground shadow-sm"
>
<div className="flex items-center gap-2 overflow-hidden">
<Building2 size={16} className="shrink-0 text-primary" />
<span className="truncate font-medium">
{currentAccount?.name || "Selecionar Conta"}
</span>
</div>
<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
</Button>
</PopoverTrigger>
<PopoverContent className="w-[240px] p-0" align="start">
<Command>
<CommandInput placeholder="Procurar conta..." />
<CommandList>
<CommandEmpty>Nenhuma conta encontrada.</CommandEmpty>
<CommandGroup>
{accounts.map((acc: Account) => (
<CommandItem
key={acc.id}
onSelect={() => {
setCurrentAccount(acc as any);
setOpen(false);
}}
>
<Check
className={cn(
"mr-2 h-4 w-4",
currentAccount?.id === acc.id ? "opacity-100" : "opacity-0"
)}
/>
{acc.name}
</CommandItem>
))}
</CommandGroup>
</CommandList>
</Command>
</PopoverContent>
</Popover>
);
}