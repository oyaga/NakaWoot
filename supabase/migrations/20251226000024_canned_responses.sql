-- 1. Tabela de Respostas Rápidas
CREATE TABLE IF NOT EXISTS public.canned_responses (
id SERIAL PRIMARY KEY,
account_id INTEGER REFERENCES public.accounts(id) ON DELETE CASCADE,
short_code TEXT NOT NULL, -- O atalho, ex: 'boasvindas'
content TEXT NOT NULL,    -- O texto real
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
UNIQUE(account_id, short_code) -- Atalho único por conta
);

-- 2. Habilitar RLS
ALTER TABLE public.canned_responses ENABLE ROW LEVEL SECURITY;

-- Política de Multi-tenancy
CREATE POLICY "Users can view canned responses of their account" ON public.canned_responses
FOR SELECT USING (
EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.account_id = canned_responses.account_id)
);

CREATE POLICY "Admins can manage canned responses" ON public.canned_responses
FOR ALL USING (
EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.account_id = canned_responses.account_id AND users.role = 'admin')
);

-- 3. Inserir alguns exemplos para teste
INSERT INTO public.canned_responses (account_id, short_code, content)
SELECT id, 'oi', 'Olá! Como posso ajudar você hoje?' FROM public.accounts LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.canned_responses (account_id, short_code, content)
SELECT id, 'tchau', 'Obrigado pelo contato! Se precisar de algo mais, estamos à disposição.' FROM public.accounts LIMIT 1
ON CONFLICT DO NOTHING;