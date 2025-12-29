-- Melhoria na função de sincronização de usuários
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
default_account_id INTEGER;
user_name TEXT;
user_avatar TEXT;
BEGIN
-- 1. Criar uma conta padrão para o novo usuário
-- Em produção, isso poderia ser condicional ou vinculado a um convite
INSERT INTO public.accounts (name)
VALUES (COALESCE(new.raw_user_meta_data->>'full_name', 'Minha Conta'))
RETURNING id INTO default_account_id;

-- 2. Extrair metadados com fallbacks
user_name := COALESCE(
new.raw_user_meta_data->>'full_name',
new.raw_user_meta_data->>'name',
split_part(new.email, '@', 1) -- Fallback para a parte do email antes do @
);

user_avatar := COALESCE(
new.raw_user_meta_data->>'avatar_url',
new.raw_user_meta_data->>'picture'
);

-- 3. Inserir no schema público
INSERT INTO public.users (id, email, name, avatar_url, account_id, role)
VALUES (
new.id,
new.email,
user_name,
user_avatar,
default_account_id,
'admin' -- Primeiro usuário da conta nasce como admin
);

RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;