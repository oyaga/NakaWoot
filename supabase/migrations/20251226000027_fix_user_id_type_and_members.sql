-- 1. Criar a tabela de Membros da Inbox (user_id é INTEGER para ligar com public.users.id)
CREATE TABLE IF NOT EXISTS public.inbox_members (
user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
inbox_id INTEGER REFERENCES public.inboxes(id) ON DELETE CASCADE,
PRIMARY KEY (user_id, inbox_id)
);

-- 2. Habilitar RLS
ALTER TABLE public.inbox_members ENABLE ROW LEVEL SECURITY;

-- 3. Política de RLS usando a ponte UUID para comparar com auth.uid()
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.inbox_members;
CREATE POLICY "Users can view their own memberships" ON public.inbox_members
FOR SELECT USING (
user_id IN (
SELECT id FROM public.users WHERE uuid = auth.uid()
)
);

-- 4. Função de Auto-Atribuição Corrigida (usando ID Integer)
CREATE OR REPLACE FUNCTION public.auto_assign_conversation()
RETURNS trigger AS $$
BEGIN
-- Se for uma mensagem enviada por um agente (message_type = 1) e tiver um user_id
IF NEW.message_type = 1 AND NEW.user_id IS NOT NULL THEN
UPDATE public.conversations
SET assignee_id = NEW.user_id
WHERE id = NEW.conversation_id AND assignee_id IS NULL;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_assign_conversation ON public.messages;
CREATE TRIGGER trg_auto_assign_conversation
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.auto_assign_conversation();

-- 5. Popular membros iniciais baseado na conta
INSERT INTO public.inbox_members (user_id, inbox_id)
SELECT u.id, i.id
FROM public.users u
JOIN public.inboxes i ON u.account_id = i.account_id
ON CONFLICT DO NOTHING;