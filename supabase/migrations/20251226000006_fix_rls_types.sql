-- 1. Limpar políticas anteriores
DROP POLICY IF EXISTS "Users can view inboxes of their account" ON public.inboxes;
DROP POLICY IF EXISTS "Users can view contacts of their account" ON public.contacts;

-- 2. Recriar com o campo UUID correto (public.users.uuid)
CREATE POLICY "Users can view inboxes of their account" ON public.inboxes
FOR SELECT USING (
account_id IN (
SELECT u.account_id
FROM public.users u
WHERE u.uuid = auth.uid() -- Aqui está a correção: usar a coluna uuid
)
);

CREATE POLICY "Users can view contacts of their account" ON public.contacts
FOR SELECT USING (
account_id IN (
SELECT u.account_id
FROM public.users u
WHERE u.uuid = auth.uid() -- Aqui está a correção: usar a coluna uuid
)
);

-- 3. Habilitar RLS nas tabelas (por segurança)
ALTER TABLE public.inboxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;