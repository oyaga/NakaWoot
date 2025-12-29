CREATE OR REPLACE VIEW public.view_conversation_list AS
SELECT
c.id,
c.display_id,
c.status,
c.account_id,
c.inbox_id,
c.created_at,
con.name AS contact_name,
con.avatar_url AS contact_avatar,
m.content AS last_message_content,
m.created_at AS last_message_at,
m.sender_type AS last_message_sender_type
FROM public.conversations c
JOIN public.contacts con ON c.contact_id = con.id
LEFT JOIN LATERAL (
SELECT content, created_at, sender_type
FROM public.messages
WHERE conversation_id = c.id
ORDER BY created_at DESC
LIMIT 1
) m ON true;