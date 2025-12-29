-- 1. Limpeza de tentativas falhas
DROP POLICY IF EXISTS "Users can view conversations of their account" ON public.conversations;
DROP POLICY IF EXISTS "Users can view messages of their account" ON public.messages;

-- 2. Recriar com a junção via coluna UUID (Ponte Supabase Auth)
CREATE POLICY "Users can view conversations of their account" ON public.conversations
FOR ALL USING (
account_id IN (
SELECT u.account_id
FROM public.users u
WHERE u.uuid = auth.uid() -- CORRETO: UUID com UUID
)
);

CREATE POLICY "Users can view messages of their account" ON public.messages
FOR ALL USING (
account_id IN (
SELECT u.account_id
FROM public.users u
WHERE u.uuid = auth.uid() -- CORRETO: UUID com UUID
)
);

-- 3. Habilitar RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;