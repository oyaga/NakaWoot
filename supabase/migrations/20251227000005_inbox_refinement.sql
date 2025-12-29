-- Adiciona campo de configurações e identificador externo para Inboxes
ALTER TABLE public.inboxes
ADD COLUMN IF NOT EXISTS channel_settings JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS external_id TEXT UNIQUE; -- Ex: Nome da instância na Evolution

-- Comentário para o time: external_id será usado para o Webhook da Evolution encontrar a Inbox correta.