-- 1. Corrigir o campo message_type (Drop e Recreate para evitar erro de cast em dev)
ALTER TABLE public.messages DROP COLUMN IF EXISTS message_type;
ALTER TABLE public.messages ADD COLUMN message_type INTEGER DEFAULT 0; -- 0: incoming, 1: outgoing

-- 2. Garantir colunas de controle na conversa
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS display_id INTEGER,
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Trigger para Display ID (Auto-incremento por conta)
CREATE OR REPLACE FUNCTION public.set_display_id()
RETURNS trigger AS $$
BEGIN
IF NEW.display_id IS NULL THEN
SELECT COALESCE(MAX(display_id), 0) + 1
INTO NEW.display_id
FROM public.conversations
WHERE account_id = NEW.account_id;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_display_id ON public.conversations;
CREATE TRIGGER trg_set_display_id
BEFORE INSERT ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.set_display_id();

-- 4. Trigger para manter a conversa atualizada com a última mensagem
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS trigger AS $$
BEGIN
UPDATE public.conversations
SET last_message_at = NEW.created_at,
updated_at = NOW()
WHERE id = NEW.conversation_id;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_conversation_timestamp ON public.messages;
CREATE TRIGGER trg_update_conversation_timestamp
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.update_conversation_timestamp();