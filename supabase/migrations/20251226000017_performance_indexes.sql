-- 1. Índices para busca rápida de conversas
CREATE INDEX IF NOT EXISTS idx_conversations_account_status ON public.conversations(account_id, status);
CREATE INDEX IF NOT EXISTS idx_conversations_contact_id ON public.conversations(contact_id);

-- 2. Índices para performance do Chat (Mensagens por conversa, ordenadas)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages(conversation_id, created_at DESC);

-- 3. Índices para a View de Perfil e Auth
CREATE INDEX IF NOT EXISTS idx_users_account_id ON public.users(account_id);

-- 4. Índice para busca de contatos por telefone (usado pelo Webhook da Evolution)
CREATE INDEX IF NOT EXISTS idx_contacts_phone_account ON public.contacts(phone_number, account_id);

-- 5. Analisar o banco para atualizar as estatísticas do otimizador
ANALYZE;