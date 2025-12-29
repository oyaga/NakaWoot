-- 1. Tabela de Times (Equipes)
CREATE TABLE IF NOT EXISTS public.teams (
id SERIAL PRIMARY KEY,
name TEXT NOT NULL,
account_id INTEGER REFERENCES public.accounts(id) ON DELETE CASCADE,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Membros de Time (user_id é INTEGER)
CREATE TABLE IF NOT EXISTS public.team_members (
team_id INTEGER REFERENCES public.teams(id) ON DELETE CASCADE,
user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
PRIMARY KEY (team_id, user_id)
);

-- 3. Histórico de Atividades / Auditoria (user_id é INTEGER)
CREATE TABLE IF NOT EXISTS public.activities (
id SERIAL PRIMARY KEY,
account_id INTEGER REFERENCES public.accounts(id) ON DELETE CASCADE,
conversation_id INTEGER REFERENCES public.conversations(id) ON DELETE CASCADE,
user_id INTEGER REFERENCES public.users(id),
activity_type TEXT NOT NULL,
metadata JSONB DEFAULT '{}'::jsonb,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Trigger para Auditoria Automática de Atribuição
CREATE OR REPLACE FUNCTION public.log_conversation_assignment()
RETURNS trigger AS $$
DECLARE
current_user_id INTEGER;
BEGIN
-- Pegar o ID Integer do usuário logado via ponte UUID
SELECT id INTO current_user_id FROM public.users WHERE uuid = auth.uid();

IF (OLD.assignee_id IS DISTINCT FROM NEW.assignee_id) THEN
INSERT INTO public.activities (account_id, conversation_id, user_id, activity_type, metadata)
VALUES (
NEW.account_id,
NEW.id,
current_user_id,
'assignee_change',
jsonb_build_object('from', OLD.assignee_id, 'to', NEW.assignee_id)
);
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_conversation_assignment ON public.conversations;
CREATE TRIGGER trg_log_conversation_assignment
AFTER UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.log_conversation_assignment();

-- 5. RLS Blindado (Pattern Ponte UUID/INT)
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view teams of their account" ON public.teams;
CREATE POLICY "Users can view teams of their account" ON public.teams
FOR SELECT USING (
account_id IN (SELECT account_id FROM public.users WHERE uuid = auth.uid())
);

DROP POLICY IF EXISTS "Users can view activities of their account" ON public.activities;
CREATE POLICY "Users can view activities of their account" ON public.activities
FOR SELECT USING (
account_id IN (SELECT account_id FROM public.users WHERE uuid = auth.uid())
);