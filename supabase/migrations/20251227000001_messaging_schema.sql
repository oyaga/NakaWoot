-- 1. Tabela de Contatos (Pessoas que mandam mensagem)
CREATE TABLE IF NOT EXISTS public.contacts (
id SERIAL PRIMARY KEY,
account_id INTEGER REFERENCES public.accounts(id) ON DELETE CASCADE,
name TEXT,
email TEXT,
phone_number TEXT,
avatar_url TEXT,
custom_attributes JSONB DEFAULT '{}'::jsonb,
additional_attributes JSONB DEFAULT '{}'::jsonb,
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Inboxes (Canais: WhatsApp, Web, etc)
CREATE TABLE IF NOT EXISTS public.inboxes (
id SERIAL PRIMARY KEY,
account_id INTEGER REFERENCES public.accounts(id) ON DELETE CASCADE,
name TEXT NOT NULL,
channel_type TEXT NOT NULL, -- 'web_widget', 'whatsapp', 'api'
allow_messages BOOLEAN DEFAULT TRUE,
created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Conversas
CREATE TABLE IF NOT EXISTS public.conversations (
id SERIAL PRIMARY KEY,
display_id SERIAL, -- O ID que o usuário vê (1, 2, 3...)
account_id INTEGER REFERENCES public.accounts(id) ON DELETE CASCADE,
inbox_id INTEGER REFERENCES public.inboxes(id) ON DELETE CASCADE,
contact_id INTEGER REFERENCES public.contacts(id) ON DELETE CASCADE,
status TEXT DEFAULT 'open', -- 'open', 'resolved', 'pending', 'snoozed'
assignee_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de Mensagens
CREATE TABLE IF NOT EXISTS public.messages (
id SERIAL PRIMARY KEY,
account_id INTEGER REFERENCES public.accounts(id) ON DELETE CASCADE,
conversation_id INTEGER REFERENCES public.conversations(id) ON DELETE CASCADE,
content TEXT,
message_type INTEGER DEFAULT 0, -- 0: incoming, 1: outgoing
sender_type TEXT, -- 'Contact', 'User', 'AgentBot'
sender_id INTEGER, -- Polimórfico (ID do Contact ou User)
external_id TEXT, -- ID da mensagem no WhatsApp/Evolution
created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_account_id ON public.conversations(account_id);
CREATE INDEX IF NOT EXISTS idx_contacts_account_id ON public.contacts(account_id);