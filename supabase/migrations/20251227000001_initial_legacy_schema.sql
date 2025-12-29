-- 1. Tabela de Contas (Multi-tenant)
CREATE TABLE public.accounts (
id SERIAL PRIMARY KEY,
name TEXT NOT NULL,
locale TEXT DEFAULT 'en',
domain TEXT,
support_email TEXT,
settings_flags INTEGER DEFAULT 0 NOT NULL,
feature_flags INTEGER DEFAULT 0 NOT NULL,
custom_attributes JSONB DEFAULT '{}'::jsonb,
created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Usuários (Sincronizada com Supabase Auth)
CREATE TABLE public.users (
id SERIAL PRIMARY KEY,
uuid UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
email TEXT NOT NULL UNIQUE,
name TEXT NOT NULL,
display_name TEXT,
avatar_url TEXT,
ui_settings JSONB DEFAULT '{}'::jsonb,
custom_attributes JSONB DEFAULT '{}'::jsonb,
availability_status INTEGER DEFAULT 0, -- 0: offline, 1: online, 2: busy
created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Ligação (Account Users / Permissões)
CREATE TABLE public.account_users (
id SERIAL PRIMARY KEY,
account_id INTEGER REFERENCES public.accounts(id) ON DELETE CASCADE,
user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
role INTEGER DEFAULT 0, -- 0: agent, 1: administrator (Paridade Chatwoot)
active BOOLEAN DEFAULT true,
created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
UNIQUE(account_id, user_id)
);

-- 4. Função de Sincronização Automática (Auth -> Public)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
INSERT INTO public.users (uuid, email, name)
VALUES (
NEW.id,
NEW.email,
COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
);
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Nota: O Trigger será habilitado assim que o LOCK for removido.
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();