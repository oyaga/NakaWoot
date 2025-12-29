-- 1. Remover a View dependente
DROP VIEW IF EXISTS public.account_summaries;

-- 2. Conversão segura de Status (TEXT -> INTEGER)
ALTER TABLE public.conversations ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.conversations
ALTER COLUMN status TYPE INTEGER USING (
CASE
WHEN status = 'resolved' THEN 1
WHEN status = 'pending' THEN 2
WHEN status = '1' THEN 1
WHEN status = '2' THEN 2
ELSE 0
END
);
ALTER TABLE public.conversations ALTER COLUMN status SET DEFAULT 0;

-- 3. Adicionar colunas de SLA e Triggers
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS first_reply_created_at TIMESTAMP WITH TIME ZONE;

CREATE OR REPLACE FUNCTION public.mark_first_reply()
RETURNS trigger AS $$
BEGIN
IF NEW.message_type = 1 THEN
UPDATE public.conversations
SET first_reply_created_at = NEW.created_at
WHERE id = NEW.conversation_id AND first_reply_created_at IS NULL;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mark_first_reply ON public.messages;
CREATE TRIGGER trg_mark_first_reply
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.mark_first_reply();

-- 4. Reconstruir a View com a nova lógica (status = 0 para abertas)
CREATE OR REPLACE VIEW public.account_summaries AS
SELECT
a.id as account_id,
(SELECT COUNT(*) FROM public.conversations c WHERE c.account_id = a.id AND c.status = 0) as active_conversations,
(SELECT COUNT(*) FROM public.contacts ct WHERE ct.account_id = a.id) as total_contacts,
(SELECT COUNT(*) FROM public.inboxes i WHERE i.account_id = a.id) as total_inboxes
FROM
public.accounts a;

GRANT SELECT ON public.account_summaries TO authenticated;