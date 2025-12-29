-- ⚡ Mensager NK - Initial Schema Blueprint
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ACCOUNTS
CREATE TABLE IF NOT EXISTS public.accounts (
id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
name TEXT NOT NULL,
created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- USERS (Linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.users (
id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
email TEXT NOT NULL,
name TEXT,
role TEXT DEFAULT 'agent' CHECK (role IN ('admin', 'agent')),
account_id uuid REFERENCES public.accounts(id),
created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- INBOXES
CREATE TABLE IF NOT EXISTS public.inboxes (
id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
name TEXT NOT NULL,
channel_type TEXT NOT NULL, -- 'whatsapp', 'web', 'api'
account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- CONTACTS
CREATE TABLE IF NOT EXISTS public.contacts (
id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
name TEXT,
email TEXT,
phone_number TEXT,
account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- CONVERSATIONS
CREATE TABLE IF NOT EXISTS public.conversations (
id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
inbox_id uuid NOT NULL REFERENCES public.inboxes(id) ON DELETE CASCADE,
contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
status TEXT DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'pending', 'snoozed')),
created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- MESSAGES
CREATE TABLE IF NOT EXISTS public.messages (
id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
content TEXT,
message_type TEXT NOT NULL CHECK (message_type IN ('incoming', 'outgoing', 'template')),
status TEXT DEFAULT 'sent',
conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
user_id uuid REFERENCES public.users(id),
created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inboxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;