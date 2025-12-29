-- 1. Garantir colunas de Notas e Erros
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS error_code TEXT,
ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- 2. Limpeza e Reconstrução da View de Performance (V4)
DROP VIEW IF EXISTS public.conversation_list_summary;

CREATE VIEW public.conversation_list_summary AS
WITH last_messages AS (
SELECT DISTINCT ON (conversation_id)
conversation_id, content, created_at as message_at, message_type, is_private
FROM public.messages ORDER BY conversation_id, created_at DESC
),
unread_counts AS (
SELECT conversation_id, COUNT(*) as count
FROM public.messages
WHERE message_type = 0 AND status != 'read' AND is_private = false
GROUP BY conversation_id
)
SELECT
c.id, c.display_id, c.account_id, c.inbox_id, c.status, c.last_message_at,
ct.name as contact_name, ct.avatar_url as contact_avatar,
i.name as inbox_name, i.channel_type,
lm.content as last_message_content, lm.message_type as last_message_type,
lm.is_private as last_message_private,
COALESCE(uc.count, 0) as unread_count,
c.assignee_id, u.name as assignee_name
FROM
public.conversations c
JOIN public.contacts ct ON c.contact_id = ct.id
JOIN public.inboxes i ON c.inbox_id = i.id
LEFT JOIN public.users u ON c.assignee_id = u.id
LEFT JOIN last_messages lm ON c.id = lm.conversation_id
LEFT JOIN unread_counts uc ON c.id = uc.conversation_id;

GRANT SELECT ON public.conversation_list_summary TO authenticated;

-- 3. RLS Blindado para Mensagens (Whisper Mode)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agents can see private messages" ON public.messages;
CREATE POLICY "Agents can see private messages"
ON public.messages FOR SELECT
USING (
account_id IN (SELECT account_id FROM public.users WHERE uuid = auth.uid()) -- PONTE UUID
AND (
is_private = false
OR (SELECT role FROM public.users WHERE uuid = auth.uid()) IN ('agent', 'administrator') -- PONTE UUID
)
);