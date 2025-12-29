-- 1. Tabela de Membros da Inbox (Quem pode ver qual canal)
CREATE TABLE IF NOT EXISTS public.inbox_members (
user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
inbox_id INTEGER REFERENCES public.inboxes(id) ON DELETE CASCADE,
PRIMARY KEY (user_id, inbox_id)
);

-- 2. Trigger para Auto-Atribuição de Conversa
-- Objetivo: O primeiro agente que responde assume a conversa automaticamente
CREATE OR REPLACE FUNCTION public.auto_assign_conversation()
RETURNS trigger AS $$
BEGIN
-- Se for uma mensagem de saída (agente) e a conversa não tiver responsável
IF NEW.message_type = 1 AND NEW.user_id IS NOT NULL THEN
UPDATE public.conversations
SET assignee_id = NEW.user_id
WHERE id = NEW.conversation_id AND assignee_id IS NULL;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_assign_conversation
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.auto_assign_conversation();

-- 3. Habilitar RLS para Membros
ALTER TABLE public.inbox_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own memberships" ON public.inbox_members
FOR SELECT USING (auth.uid() = user_id);

-- 4. Inserir o criador da conta como membro da inbox de teste
INSERT INTO public.inbox_members (user_id, inbox_id)
SELECT u.id, i.id
FROM public.users u, public.inboxes i
WHERE u.account_id = i.account_id
ON CONFLICT DO NOTHING;