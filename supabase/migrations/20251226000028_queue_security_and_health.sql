-- 1. Tabela para Monitoramento de Saúde da Instância (Evolution API)
CREATE TABLE IF NOT EXISTS public.inbox_statuses (
inbox_id INTEGER PRIMARY KEY REFERENCES public.inboxes(id) ON DELETE CASCADE,
is_online BOOLEAN DEFAULT false,
battery_level INTEGER,
last_seen TIMESTAMP WITH TIME ZONE,
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Atualizar View de Conversas para incluir o Nome do Agente (Assignee Name)
CREATE OR REPLACE VIEW public.conversation_list_summary AS
WITH last_messages AS (
SELECT DISTINCT ON (conversation_id)
conversation_id, content, created_at as message_at, message_type
FROM public.messages ORDER BY conversation_id, created_at DESC
),
unread_counts AS (
SELECT conversation_id, COUNT(*) as count
FROM public.messages WHERE message_type = 0 AND status != 'read' GROUP BY conversation_id
)
SELECT
c.id, c.display_id, c.account_id, c.inbox_id, c.status, c.last_message_at,
ct.name as contact_name, ct.avatar_url as contact_avatar,
i.name as inbox_name, i.channel_type,
lm.content as last_message_content, lm.message_type as last_message_type,
COALESCE(uc.count, 0) as unread_count,
c.assignee_id,
u.name as assignee_name -- Novo campo: Nome do Agente Responsável
FROM
public.conversations c
JOIN public.contacts ct ON c.contact_id = ct.id
JOIN public.inboxes i ON c.inbox_id = i.id
LEFT JOIN public.users u ON c.assignee_id = u.id -- Join com Usuários
LEFT JOIN last_messages lm ON c.id = lm.conversation_id
LEFT JOIN unread_counts uc ON c.id = uc.conversation_id
ORDER BY c.last_message_at DESC;

-- 3. Reforçar RLS: Agentes só vêem conversas de Inboxes onde são membros
-- Nota: Admins continuam vendo tudo da conta
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view assigned or member conversations" ON public.conversations;
CREATE POLICY "Users can view assigned or member conversations" ON public.conversations
FOR SELECT USING (
EXISTS (
SELECT 1 FROM public.users
WHERE users.id = auth.uid()
AND (
users.role = 'admin' -- Admin vê tudo
OR EXISTS ( -- Agente vê se for membro da inbox
SELECT 1 FROM public.inbox_members
WHERE inbox_members.inbox_id = conversations.inbox_id
AND inbox_members.user_id = auth.uid()
)
)
)
);

GRANT SELECT ON public.conversation_list_summary TO authenticated;