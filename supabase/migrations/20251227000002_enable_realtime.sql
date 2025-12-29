-- Habilita o Realtime para as tabelas principais
begin;
-- Remove as publicações existentes se houver (para evitar erros de duplicidade)
drop publication if exists supabase_realtime;

-- Cria a publicação para as tabelas que o Frontend precisa monitorar
create publication supabase_realtime for table
public.messages,
public.conversations,
public.contacts;
commit;

-- Adiciona suporte a Replicação para capturar detalhes das mudanças
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;