-- 1. Garantir que a tabela existe
CREATE TABLE IF NOT EXISTS public.webhook_logs (
id SERIAL PRIMARY KEY,
inbox_id INTEGER REFERENCES public.inboxes(id) ON DELETE CASCADE,
provider TEXT DEFAULT 'evolution',
payload JSONB,
status TEXT,
error_message TEXT,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- 3. Remover política com erro
DROP POLICY IF EXISTS "Admins can view webhook logs" ON public.webhook_logs;

-- 4. Criar política usando a ponte UUID correta
CREATE POLICY "Admins can view webhook logs" ON public.webhook_logs
FOR SELECT USING (
EXISTS (
SELECT 1 FROM public.users
WHERE public.users.uuid = auth.uid() -- CORRETO: UUID com UUID
AND public.users.role = 'administrator'
)
);

-- 5. Atualizar metadados da Inbox para o Backend Go
UPDATE public.inboxes
SET metadata = jsonb_build_object(
'instance_name', 'MensagerNK_Primary',
'provider', 'evolution',
    'webhook_url', 'http://localhost:4120/api/v1/webhooks/evolution',
    'api_url', 'http://localhost:4120/api/v1',)
WHERE name = 'WhatsApp Principal';