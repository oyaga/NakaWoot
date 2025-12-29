-- View Atualizada: Inboxes + Unread Count
CREATE OR REPLACE VIEW public.conversation_list_summary AS
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
-- Conta mensagens recebidas (incoming) que não foram lidas
-- Nota: Precisaremos de uma coluna 'read_at' no futuro para precisão total
SELECT
conversation_id,
COUNT(*) as count
FROM public.messages
WHERE message_type = 0 AND status != 'read'
GROUP BY conversation_id
)
SELECT
c.id,
c.display_id,
c.account_id,
c.inbox_id,
c.status,
c.last_message_at,
c.created_at,
ct.name as contact_name,
ct.avatar_url as contact_avatar,
i.name as inbox_name, -- Join com Inboxes adicionado
i.channel_type,
lm.content as last_message_content,
lm.message_type as last_message_type,
COALESCE(uc.count, 0) as unread_count -- Contador de não lidas
FROM
public.conversations c
JOIN
public.contacts ct ON c.contact_id = ct.id
JOIN
public.inboxes i ON c.inbox_id = i.id
LEFT JOIN
last_messages lm ON c.id = lm.conversation_id
LEFT JOIN
unread_counts uc ON c.id = uc.conversation_id
ORDER BY
c.last_message_at DESC;

GRANT SELECT ON public.conversation_list_summary TO authenticated;