-- Garantir que a coluna account_id existe na tabela users
DO $$
BEGIN
IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='account_id') THEN
ALTER TABLE public.users ADD COLUMN account_id INTEGER REFERENCES public.accounts(id);
END IF;
END $$;

-- Corrigir as políticas de RLS (Garantindo cast de tipos se necessário)
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile"
ON public.users FOR SELECT
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
ON public.users FOR UPDATE
USING (auth.uid() = id);

-- Habilitar RLS na tabela de contas
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their account" ON public.accounts;
CREATE POLICY "Users can view their account"
ON public.accounts FOR SELECT
USING (
EXISTS (
SELECT 1 FROM public.users
WHERE public.users.account_id = public.accounts.id
AND public.users.id = auth.uid()
)
);