-- Habilitar RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Política: Usuários só podem ler seus próprios dados
CREATE POLICY "Users can view own profile"
ON public.users
FOR SELECT
USING (auth.uid() = uuid);

-- Política: Service Role (Backend Go) pode fazer tudo
CREATE POLICY "Service role has full access"
ON public.users
TO service_role
USING (true)
WITH CHECK (true);