-- 1. Garantir que avatar_url existe na tabela de contatos
DO $$
BEGIN
IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='avatar_url') THEN
ALTER TABLE public.contacts ADD COLUMN avatar_url TEXT;
END IF;
END $$;

-- 2. View de Conversas Otimizada (Retry)
CREATE OR REPLACE VIEW public.conversation_list_summary AS
WITH last_messages AS (
SELECT DISTINCT ON (conversation_id)
conversation_id,
content,
created_at as message_at,
message_type
FROM public.messages
ORDER BY conversation_id, created_at DESC
)
SELECT
c.id,
c.display_id,
c.account_id,
c.status,
c.last_message_at,
c.created_at,
ct.name as contact_name,
ct.avatar_url as contact_avatar,
lm.content as last_message_content,
lm.message_type as last_message_type
FROM
public.conversations c
JOIN
public.contacts ct ON c.contact_id = ct.id
LEFT JOIN
last_messages lm ON c.id = lm.conversation_id;

GRANT SELECT ON public.conversation_list_summary TO authenticated;