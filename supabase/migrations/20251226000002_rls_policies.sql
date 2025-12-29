-- Habilitar RLS na tabela de usuários
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ler seus próprios dados
CREATE POLICY "Users can view own profile"
ON public.users FOR SELECT
USING (auth.uid() = id);

-- Política: Usuários podem atualizar seus próprios dados
CREATE POLICY "Users can update own profile"
ON public.users FOR UPDATE
USING (auth.uid() = id);

-- Habilitar RLS na tabela de contas
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver a conta a qual pertencem
CREATE POLICY "Users can view their account"
ON public.accounts FOR SELECT
USING (
EXISTS (
SELECT 1 FROM public.users
WHERE public.users.account_id = public.accounts.id
AND public.users.id = auth.uid()
)
);