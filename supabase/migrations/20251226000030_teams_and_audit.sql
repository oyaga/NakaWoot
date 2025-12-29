-- 1. Tabela de Times (Equipes)
CREATE TABLE IF NOT EXISTS public.teams (
id SERIAL PRIMARY KEY,
name TEXT NOT NULL,
account_id INTEGER REFERENCES public.accounts(id) ON DELETE CASCADE,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Membros de Time
CREATE TABLE IF NOT EXISTS public.team_members (
team_id INTEGER REFERENCES public.teams(id) ON DELETE CASCADE,
user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
PRIMARY KEY (team_id, user_id)
);

-- 3. Histórico de Atividades (Audit Log)
-- Registra eventos como: "Agente X assumiu a conversa", "Status alterado para Resolvido"
CREATE TABLE IF NOT EXISTS public.activities (
id SERIAL PRIMARY KEY,
account_id INTEGER REFERENCES public.accounts(id) ON DELETE CASCADE,
conversation_id INTEGER REFERENCES public.conversations(id) ON DELETE CASCADE,
user_id UUID REFERENCES public.users(id), -- Quem fez a ação
activity_type TEXT NOT NULL, -- 'status_change', 'assignee_change', 'team_change'
metadata JSONB DEFAULT '{}'::jsonb, -- De: Para:
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Trigger para Auditoria Automática de Atribuição
CREATE OR REPLACE FUNCTION public.log_conversation_assignment()
RETURNS trigger AS $$
BEGIN
IF (OLD.assignee_id IS DISTINCT FROM NEW.assignee_id) THEN
INSERT INTO public.activities (account_id, conversation_id, user_id, activity_type, metadata)
VALUES (
NEW.account_id,
NEW.id,
auth.uid(),
'assignee_change',
jsonb_build_object('from', OLD.assignee_id, 'to', NEW.assignee_id)
);
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_log_conversation_assignment
AFTER UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.log_conversation_assignment();

-- Habilitar RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view teams of their account" ON public.teams
FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.account_id = teams.account_id));

CREATE POLICY "Users can view activities of their account" ON public.activities
FOR SELECT USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.account_id = activities.account_id));