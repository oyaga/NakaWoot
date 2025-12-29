'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function NewConversationModal() {
return (
<Dialog>
<DialogTrigger asChild>
<Button size="sm" className="bg-blue-600 hover:bg-blue-700">
<Plus size={16} className="mr-2" /> Nova
</Button>
</DialogTrigger>
<DialogContent>
<DialogHeader>
<DialogTitle>Iniciar Nova Conversa</DialogTitle>
</DialogHeader>
<div className="space-y-4 py-4">
<div className="space-y-2">
<Label>Canal</Label>
<Select>
<SelectTrigger>
<SelectValue placeholder="Selecione um canal" />
</SelectTrigger>
<SelectContent>
<SelectItem value="wa">WhatsApp (Evolution)</SelectItem>
<SelectItem value="api">API Customizada</SelectItem>
</SelectContent>
</Select>
</div>
<div className="space-y-2">
<Label>Destinatário</Label>
<Input placeholder="Nome ou número de telefone" autoComplete="off" />
</div>
<Button className="w-full bg-blue-600 hover:bg-blue-700">Criar Conversa</Button>
</div>
</DialogContent>
</Dialog>
);
}