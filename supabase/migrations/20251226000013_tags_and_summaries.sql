-- 1. Tabela de Tags (Etiquetas)
CREATE TABLE IF NOT EXISTS public.tags (
id SERIAL PRIMARY KEY,
name TEXT NOT NULL,
color TEXT DEFAULT '#3B82F6', -- Azul padrão
account_id INTEGER REFERENCES public.accounts(id) ON DELETE CASCADE,
UNIQUE(name, account_id)
);

-- 2. Tabela de Associação (Contatos <-> Tags)
CREATE TABLE IF NOT EXISTS public.contact_tags (
contact_id INTEGER REFERENCES public.contacts(id) ON DELETE CASCADE,
tag_id INTEGER REFERENCES public.tags(id) ON DELETE CASCADE,
PRIMARY KEY (contact_id, tag_id)
);

-- 3. View de Estatísticas para o Dashboard
-- Isso evita que o Backend tenha que fazer múltiplos COUNTs
CREATE OR REPLACE VIEW public.account_summaries AS
SELECT
a.id as account_id,
(SELECT COUNT(*) FROM public.conversations c WHERE c.account_id = a.id AND c.status = 'open') as active_conversations,
(SELECT COUNT(*) FROM public.contacts ct WHERE ct.account_id = a.id) as total_contacts,
(SELECT COUNT(*) FROM public.inboxes i WHERE i.account_id = a.id) as total_inboxes
FROM
public.accounts a;

-- 4. Habilitar RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;

-- Políticas de Multi-tenancy
CREATE POLICY "Users can view tags of their account" ON public.tags
FOR ALL USING (
EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.account_id = tags.account_id)
);

CREATE POLICY "Users can manage contact tags" ON public.contact_tags
FOR ALL USING (
EXISTS (
SELECT 1 FROM public.contacts
JOIN public.users ON users.account_id = contacts.account_id
WHERE contacts.id = contact_tags.contact_id AND users.id = auth.uid()
)
);

-- Garantir acesso à view de resumo
GRANT SELECT ON public.account_summaries TO authenticated;