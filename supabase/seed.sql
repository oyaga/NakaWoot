-- Criar uma conta padrão para testes
INSERT INTO public.accounts (id, name, locale)
VALUES (1, 'Mensager NK HQ', 'pt-BR')
ON CONFLICT (id) DO NOTHING;

-- Nota: O usuário 'admin@admin.com' deve ser criado via painel do Supabase
-- ou via CLI para gerar o UUID no schema 'auth'.

-- Vincular o usuário admin (UUID fictício para exemplo) à conta 1 como administrador
-- INSERT INTO public.account_users (account_id, user_id, role)
-- VALUES (1, (SELECT id FROM public.users WHERE email = 'admin@admin.com'), 1);