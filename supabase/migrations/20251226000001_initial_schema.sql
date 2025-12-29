-- Habilitar UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de Contas (Accounts)
CREATE TABLE IF NOT EXISTS public.accounts (
id SERIAL PRIMARY KEY,
name TEXT NOT NULL,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Usuários (Public Users - vinculada ao Auth)
CREATE TABLE IF NOT EXISTS public.users (
id UUID REFERENCES auth.users(id) PRIMARY KEY,
email TEXT UNIQUE NOT NULL,
name TEXT,
avatar_url TEXT,
account_id INTEGER REFERENCES public.accounts(id),
role TEXT DEFAULT 'agent',
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Função para Sincronizar Auth -> Public
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
default_account_id INTEGER;
BEGIN
-- Criar uma conta padrão para o primeiro usuário (ou lógica customizada)
INSERT INTO public.accounts (name) VALUES ('Default Account') RETURNING id INTO default_account_id;

INSERT INTO public.users (id, email, name, account_id)
VALUES (
new.id,
new.email,
new.raw_user_meta_data->>'full_name',
default_account_id
);
RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger de Automação
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();