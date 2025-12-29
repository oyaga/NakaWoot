-- Adiciona suporte a busca textual em Mensagens
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS fts tsvector
GENERATED ALWAYS AS (to_tsvector('portuguese', coalesce(content, ''))) STORED;

CREATE INDEX IF NOT EXISTS idx_messages_fts ON public.messages USING GIN (fts);

-- Adiciona suporte a busca textual em Contatos
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS fts tsvector
GENERATED ALWAYS AS (to_tsvector('portuguese', coalesce(name, '') || ' ' || coalesce(email, '') || ' ' || coalesce(phone_number, ''))) STORED;

CREATE INDEX IF NOT EXISTS idx_contacts_fts ON public.contacts USING GIN (fts);