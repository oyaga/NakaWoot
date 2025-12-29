-- Extension para UUIDs e JWT
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de Contas (Accounts)
CREATE TABLE IF NOT EXISTS public.accounts (
id SERIAL PRIMARY KEY,
name TEXT NOT NULL,
status TEXT DEFAULT 'active',
locale TEXT DEFAULT 'en',
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Usuários (Sincronizada com Auth)
CREATE TABLE IF NOT EXISTS public.users (
id SERIAL PRIMARY KEY,
uuid UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
email TEXT UNIQUE NOT NULL,
name TEXT,
display_name TEXT,
availability_status TEXT DEFAULT 'offline',
avatar_url TEXT,
ui_settings JSONB DEFAULT '{}'::jsonb,
created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Vínculo (Account Users)
CREATE TABLE IF NOT EXISTS public.account_users (
id SERIAL PRIMARY KEY,
account_id INTEGER REFERENCES public.accounts(id) ON DELETE CASCADE,
user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
role TEXT DEFAULT 'agent',
created_at TIMESTAMPTZ DEFAULT NOW(),
UNIQUE(account_id, user_id)
);

-- Trigger para sincronizar auth.users -> public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
INSERT INTO public.users (uuid, email, name)
VALUES (new.id, new.email, new.raw_user_meta_data->>'name');
RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();