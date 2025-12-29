-- 1. Adicionar coluna de metadados para configurações da Inbox
ALTER TABLE public.inboxes
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Tabela de Webhook Logs (Crucial para debug de integração com Evolution)
CREATE TABLE IF NOT EXISTS public.webhook_logs (
id SERIAL PRIMARY KEY,
inbox_id INTEGER REFERENCES public.inboxes(id) ON DELETE CASCADE,
provider TEXT DEFAULT 'evolution',
payload JSONB,
status TEXT, -- 'success', 'error'
error_message TEXT,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Inserir metadados na Inbox de teste para o Backend Go
UPDATE public.inboxes
SET metadata = '{
"instance_name": "MensagerNK_Primary",
"provider": "evolution",
"webhook_url": "http://localhost:8080/api/v1/webhooks/evolution"
}'::jsonb
WHERE name = 'WhatsApp Principal';

-- Habilitar RLS no log para debug do Admin
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view webhook logs" ON public.webhook_logs
FOR SELECT USING (
EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin')
);