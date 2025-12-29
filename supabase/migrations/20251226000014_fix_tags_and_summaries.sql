-- 1. Correção de tipo na coluna status (Conversations)
ALTER TABLE public.conversations ALTER COLUMN status TYPE TEXT USING status::text;

-- 2. Garantir Tabelas de Tags
CREATE TABLE IF NOT EXISTS public.tags (
id SERIAL PRIMARY KEY,
name TEXT NOT NULL,
color TEXT DEFAULT '#3B82F6',
account_id INTEGER REFERENCES public.accounts(id) ON DELETE CASCADE,
UNIQUE(name, account_id)
);

CREATE TABLE IF NOT EXISTS public.contact_tags (
contact_id INTEGER REFERENCES public.contacts(id) ON DELETE CASCADE,
tag_id INTEGER REFERENCES public.tags(id) ON DELETE CASCADE,
PRIMARY KEY (contact_id, tag_id)
);

-- 3. View de Sumário (Dashboard)
CREATE OR REPLACE VIEW public.account_summaries AS
SELECT
a.id as account_id,
(SELECT COUNT(*) FROM public.conversations c WHERE c.account_id = a.id AND c.status = 'open') as active_conversations,
(SELECT COUNT(*) FROM public.contacts ct WHERE ct.account_id = a.id) as total_contacts,
(SELECT COUNT(*) FROM public.inboxes i WHERE i.account_id = a.id) as total_inboxes
FROM
public.accounts a;

GRANT SELECT ON public.account_summaries TO authenticated;

-- 4. RLS - Correção do Operador (UUID = UUID)
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view tags of their account" ON public.tags;
CREATE POLICY "Users can view tags of their account" ON public.tags
FOR ALL USING (
account_id IN (
SELECT u.account_id
FROM public.users u
WHERE u.uuid = auth.uid() -- PONTE CORRETA
)
);

DROP POLICY IF EXISTS "Users can manage contact tags" ON public.contact_tags;
CREATE POLICY "Users can manage contact tags" ON public.contact_tags
FOR ALL USING (
EXISTS (
SELECT 1 FROM public.contacts c
WHERE c.id = contact_tags.contact_id
AND c.account_id IN (
SELECT u.account_id
FROM public.users u
WHERE u.uuid = auth.uid() -- PONTE CORRETA
)
)
);