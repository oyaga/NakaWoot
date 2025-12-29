-- 1. Inboxes (Onde as mensagens chegam: WhatsApp, Instagram, etc)
CREATE TABLE IF NOT EXISTS public.inboxes (
id SERIAL PRIMARY KEY,
name TEXT NOT NULL,
channel_type TEXT NOT NULL, -- 'whatsapp', 'web_widget', etc
account_id INTEGER REFERENCES public.accounts(id) ON DELETE CASCADE,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Contacts (Os clientes que mandam mensagem)
CREATE TABLE IF NOT EXISTS public.contacts (
id SERIAL PRIMARY KEY,
name TEXT,
email TEXT,
phone_number TEXT,
account_id INTEGER REFERENCES public.accounts(id) ON DELETE CASCADE,
avatar_url TEXT,
metadata JSONB DEFAULT '{}'::jsonb,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
UNIQUE(phone_number, account_id)
);

-- 3. Inserir uma Inbox de teste para o dev
INSERT INTO public.inboxes (name, channel_type, account_id)
SELECT 'WhatsApp Principal', 'whatsapp', id FROM public.accounts LIMIT 1;

-- Habilitar RLS
ALTER TABLE public.inboxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Políticas: Apenas membros da mesma account podem ver
CREATE POLICY "Users can view inboxes of their account" ON public.inboxes
FOR SELECT USING (
EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.account_id = inboxes.account_id)
);

CREATE POLICY "Users can view contacts of their account" ON public.contacts
FOR SELECT USING (
EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.account_id = contacts.account_id)
);