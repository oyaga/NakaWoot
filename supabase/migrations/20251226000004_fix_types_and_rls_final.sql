-- 1. Garantir que o RLS use a coluna UUID para comparação com auth.uid()
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile"
ON public.users FOR SELECT
USING (uuid = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
ON public.users FOR UPDATE
USING (uuid = auth.uid());

-- 2. Corrigir Política da Tabela Accounts
-- O link deve ser: auth.uid() -> public.users.uuid -> public.users.account_id -> public.accounts.id
DROP POLICY IF EXISTS "Users can view their account" ON public.accounts;
CREATE POLICY "Users can view their account"
ON public.accounts FOR SELECT
USING (
EXISTS (
SELECT 1 FROM public.users
WHERE public.users.account_id = public.accounts.id
AND public.users.uuid = auth.uid()
)
);

-- 3. Ajustar a função de trigger para garantir que o UUID seja inserido corretamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
new_account_id INTEGER;
BEGIN
-- Criar uma conta padrão para o novo usuário
INSERT INTO public.accounts (name, created_at, updated_at)
VALUES (new.raw_user_meta_data->>'full_name' || '''s Account', NOW(), NOW())
RETURNING id INTO new_account_id;

-- Inserir o perfil do usuário linkando o UUID do Auth com o INTEGER da Account
INSERT INTO public.users (uuid, email, name, account_id, role, created_at, updated_at)
VALUES (
new.id,
new.email,
COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
new_account_id,
'administrator',
NOW(),
NOW()
);

RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;