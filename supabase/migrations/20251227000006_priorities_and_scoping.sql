-- 1. Adicionar coluna de prioridade com restrição de valores
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium'
CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

-- 2. Função para calcular o display_id sequencial por conta
CREATE OR REPLACE FUNCTION public.set_display_id()
RETURNS trigger AS $$
BEGIN
IF NEW.display_id IS NULL OR NEW.display_id = 0 THEN
SELECT COALESCE(MAX(display_id), 0) + 1
INTO NEW.display_id
FROM public.conversations
WHERE account_id = NEW.account_id;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger para aplicar o display_id antes da inserção
DROP TRIGGER IF EXISTS trg_set_display_id ON public.conversations;
CREATE TRIGGER trg_set_display_id
BEFORE INSERT ON public.conversations
FOR EACH ROW EXECUTE PROCEDURE public.set_display_id();

-- 4. Atualizar a View de Inbox para incluir a Prioridade
CREATE OR REPLACE VIEW public.view_conversation_list AS
SELECT
c.id,
c.display_id,
c.status,
c.priority, -- Campo adicionado
c.account_id,
c.inbox_id,
c.assignee_id, -- Campo adicionado para suporte a filtros "Mine/Unassigned"
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