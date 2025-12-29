-- 1. Adicionar colunas necessárias na tabela de conversas
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS display_id INTEGER,
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Função para gerar Display ID auto-incrementado por Conta
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

CREATE TRIGGER trg_set_display_id
BEFORE INSERT ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.set_display_id();

-- 3. Função para atualizar last_message_at automaticamente
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

CREATE TRIGGER trg_update_conversation_timestamp
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.update_conversation_timestamp();

-- 4. Ajustar tipo de message_type para INTEGER (0: incoming, 1: outgoing)
-- Para facilitar o mapeamento que o Frontend já está usando
ALTER TABLE public.messages
ALTER COLUMN message_type TYPE INTEGER USING (CASE WHEN message_type = 'outgoing' THEN 1 ELSE 0 END);