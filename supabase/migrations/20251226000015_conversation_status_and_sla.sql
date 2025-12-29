-- 1. Alterar status para INTEGER (0: open, 1: resolved, 2: pending)
-- Primeiro removemos o default antigo
ALTER TABLE public.conversations ALTER COLUMN status DROP DEFAULT;

-- Conversão segura de TEXT para INTEGER
ALTER TABLE public.conversations
ALTER COLUMN status TYPE INTEGER USING (
CASE
WHEN status = 'resolved' THEN 1
WHEN status = 'pending' THEN 2
ELSE 0
END
);

ALTER TABLE public.conversations ALTER COLUMN status SET DEFAULT 0;

-- 2. Adicionar coluna para métrica de SLA
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS first_reply_created_at TIMESTAMP WITH TIME ZONE;

-- 3. Trigger para capturar a primeira resposta do agente
CREATE OR REPLACE FUNCTION public.mark_first_reply()
RETURNS trigger AS $$
BEGIN
-- Se for uma mensagem de saída (agente) e a conversa ainda não tiver registro de primeira resposta
IF NEW.message_type = 1 THEN
UPDATE public.conversations
SET first_reply_created_at = NEW.created_at
WHERE id = NEW.conversation_id AND first_reply_created_at IS NULL;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_mark_first_reply
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.mark_first_reply();

-- 4. Atualizar a View de Sumário (View fixa para status inteiro)
CREATE OR REPLACE VIEW public.account_summaries AS
SELECT
a.id as account_id,
(SELECT COUNT(*) FROM public.conversations c WHERE c.account_id = a.id AND c.status = 0) as active_conversations,
(SELECT COUNT(*) FROM public.contacts ct WHERE ct.account_id = a.id) as total_contacts,
(SELECT COUNT(*) FROM public.inboxes i WHERE i.account_id = a.id) as total_inboxes
FROM
public.accounts a;

GRANT SELECT ON public.account_summaries TO authenticated;