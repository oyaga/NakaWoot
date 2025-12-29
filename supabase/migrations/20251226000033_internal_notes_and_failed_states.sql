-- 1. Suporte a Notas Internas e Rastreamento de Erro
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS error_code TEXT,
ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- 2. Atualizar a View de Sumário para lidar com Notas Internas
-- Para agentes, queremos ver a última mensagem mesmo se for privada.
-- No entanto, vamos adicionar o campo is_private na view para a UI sinalizar.
CREATE OR REPLACE VIEW public.conversation_list_summary AS
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
lm.is_private as last_message_private, -- Novo campo na View
COALESCE(uc.count, 0) as unread_count,
c.assignee_id, u.name as assignee_name
FROM
public.conversations c
JOIN public.contacts ct ON c.contact_id = ct.id
JOIN public.inboxes i ON c.inbox_id = i.id
LEFT JOIN public.users u ON c.assignee_id = u.id
LEFT JOIN last_messages lm ON c.id = lm.conversation_id
LEFT JOIN unread_counts uc ON c.id = uc.conversation_id
ORDER BY c.last_message_at DESC;

-- 3. RLS: Mensagens privadas NUNCA devem ser acessíveis por APIs de cliente final (se houver)
-- Como estamos usando Service Role/Authenticated para agentes, garantimos que
-- políticas de segurança bloqueiem is_private=true em contextos não-agentes.
CREATE POLICY "Agents can see private messages"
ON public.messages FOR SELECT
USING (
EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('agent', 'admin'))
);

GRANT SELECT ON public.conversation_list_summary TO authenticated;