-- 1. Garantir que a tabela existe
CREATE TABLE IF NOT EXISTS public.canned_responses (
id SERIAL PRIMARY KEY,
account_id INTEGER REFERENCES public.accounts(id) ON DELETE CASCADE,
short_code TEXT NOT NULL,
content TEXT NOT NULL,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
UNIQUE(account_id, short_code)
);

-- 2. Habilitar RLS
ALTER TABLE public.canned_responses ENABLE ROW LEVEL SECURITY;

-- 3. Limpeza de políticas falhas
DROP POLICY IF EXISTS "Users can view canned responses of their account" ON public.canned_responses;
DROP POLICY IF EXISTS "Admins can manage canned responses" ON public.canned_responses;

-- 4. Recriar políticas usando a coluna UUID (Ponte Supabase Auth)
CREATE POLICY "Users can view canned responses of their account" ON public.canned_responses
FOR SELECT USING (
account_id IN (
SELECT u.account_id
FROM public.users u
WHERE u.uuid = auth.uid() -- CORRETO: UUID com UUID
)
);

CREATE POLICY "Admins can manage canned responses" ON public.canned_responses
FOR ALL USING (
account_id IN (
SELECT u.account_id
FROM public.users u
WHERE u.uuid = auth.uid() -- CORRETO: UUID com UUID
AND u.role = 'administrator'
)
);

-- 5. Dados de Teste
INSERT INTO public.canned_responses (account_id, short_code, content)
SELECT id, 'oi', 'Olá! Como posso ajudar você hoje?' FROM public.accounts LIMIT 1
ON CONFLICT (account_id, short_code) DO NOTHING;