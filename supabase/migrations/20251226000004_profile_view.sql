-- View para facilitar a leitura do perfil no Frontend
CREATE OR REPLACE VIEW public.user_profiles AS
SELECT
u.id,
u.email,
u.name,
u.role,
u.avatar_url,
u.account_id,
a.name as account_name
FROM
public.users u
JOIN
public.accounts a ON u.account_id = a.id;

-- Garantir que o RLS se aplique à View (via as tabelas base)
GRANT SELECT ON public.user_profiles TO authenticated;