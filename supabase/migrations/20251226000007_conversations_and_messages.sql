-- 1. Tabela de Conversas
CREATE TABLE IF NOT EXISTS public.conversations (
id SERIAL PRIMARY KEY,
account_id INTEGER REFERENCES public.accounts(id) ON DELETE CASCADE,
inbox_id INTEGER REFERENCES public.inboxes(id) ON DELETE CASCADE,
contact_id INTEGER REFERENCES public.contacts(id) ON DELETE CASCADE,
status TEXT DEFAULT 'open', -- 'open', 'resolved', 'pending'
assignee_id UUID REFERENCES public.users(id),
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Mensagens
CREATE TABLE IF NOT EXISTS public.messages (
id SERIAL PRIMARY KEY,
content TEXT,
account_id INTEGER REFERENCES public.accounts(id) ON DELETE CASCADE,
inbox_id INTEGER REFERENCES public.inboxes(id) ON DELETE CASCADE,
conversation_id INTEGER REFERENCES public.conversations(id) ON DELETE CASCADE,
user_id UUID REFERENCES public.users(id), -- Null se for do cliente
contact_id INTEGER REFERENCES public.contacts(id), -- Null se for do agente
message_type TEXT NOT NULL, -- 'incoming' (cliente), 'outgoing' (agente)
status TEXT DEFAULT 'sent', -- 'sent', 'delivered', 'read'
metadata JSONB DEFAULT '{}'::jsonb,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Habilitar RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança (Multi-tenant)
CREATE POLICY "Users can view conversations of their account" ON public.conversations
FOR ALL USING (
EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.account_id = conversations.account_id)
);

CREATE POLICY "Users can view messages of their account" ON public.messages
FOR ALL USING (
EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.account_id = messages.account_id)
);

-- 4. Habilitar REALTIME para Mensagens
-- Isso permite o Front dar um .on('postgres_changes', ...)
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;