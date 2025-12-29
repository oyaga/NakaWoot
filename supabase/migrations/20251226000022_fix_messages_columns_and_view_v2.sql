-- 1. Garantir que as colunas essenciais existem na tabela messages
DO $$
BEGIN
IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='status') THEN
ALTER TABLE public.messages ADD COLUMN status TEXT DEFAULT 'sent';
END IF;

IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='metadata') THEN
ALTER TABLE public.messages ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
END IF;
END $$;

-- 2. Limpeza total da view antiga para evitar conflito de colunas
DROP VIEW IF EXISTS public.conversation_list_summary;

-- 3. Criação da View V2 (Inboxes + Unread Count)
CREATE VIEW public.conversation_list_summary AS
WITH last_messages AS (
SELECT DISTINCT ON (conversation_id)
conversation_id,
content,
created_at as message_at,
message_type
FROM public.messages
ORDER BY conversation_id, created_at DESC
),
unread_counts AS (
SELECT
conversation_id,
COUNT(*) as count
FROM public.messages
WHERE message_type = 0 AND (status IS NULL OR status != 'read')
GROUP BY conversation_id
)
SELECT
c.id,
c.display_id,
c.account_id,
c.inbox_id,
c.status as conversation_status,
c.last_message_at,
c.created_at,
ct.name as contact_name,
ct.avatar_url as contact_avatar,
i.name as inbox_name,
i.channel_type,
lm.content as last_message_content,
lm.message_type as last_message_type,
COALESCE(uc.count, 0) as unread_count
FROM
public.conversations c
JOIN
public.contacts ct ON c.contact_id = ct.id
JOIN
public.inboxes i ON c.inbox_id = i.id
LEFT JOIN
last_messages lm ON c.id = lm.conversation_id
LEFT JOIN
unread_counts uc ON c.id = uc.conversation_id;

GRANT SELECT ON public.conversation_list_summary TO authenticated;