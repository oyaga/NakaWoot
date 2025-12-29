-- 1. Campos Personalizados (JSONB para flexibilidade total)
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS custom_attributes JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS custom_attributes JSONB DEFAULT '{}'::jsonb;

-- 2. Tabela de Ligação: Times <-> Inboxes
-- Permite que um time inteiro tenha acesso a um canal de atendimento
CREATE TABLE IF NOT EXISTS public.inbox_teams (
inbox_id INTEGER REFERENCES public.inboxes(id) ON DELETE CASCADE,
team_id INTEGER REFERENCES public.teams(id) ON DELETE CASCADE,
PRIMARY KEY (inbox_id, team_id)
);

-- 3. Atualizar RLS da View de Conversas
-- Agora um agente vê a conversa se:
-- a) Ele for Admin
-- b) Ele for membro individual da Inbox
-- c) Ele pertencer a um TIME que é dono da Inbox
CREATE OR REPLACE FUNCTION public.check_conversation_access(p_inbox_id INTEGER, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
RETURN EXISTS (
SELECT 1 FROM public.users u
WHERE u.id = p_user_id
AND (
u.role = 'admin'
OR EXISTS (SELECT 1 FROM public.inbox_members im WHERE im.inbox_id = p_inbox_id AND im.user_id = p_user_id)
OR EXISTS (
SELECT 1 FROM public.inbox_teams it
JOIN public.team_members tm ON it.team_id = tm.team_id
WHERE it.inbox_id = p_inbox_id AND tm.user_id = p_user_id
)
)
);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar a nova lógica na política de RLS
DROP POLICY IF EXISTS "Users can view assigned or member conversations" ON public.conversations;
CREATE POLICY "Users can view assigned or member conversations" ON public.conversations
FOR SELECT USING (public.check_conversation_access(conversations.inbox_id, auth.uid()));

-- 4. Índice GIN para performance em buscas dentro do JSONB
CREATE INDEX IF NOT EXISTS idx_contacts_custom_attr ON public.contacts USING GIN (custom_attributes);