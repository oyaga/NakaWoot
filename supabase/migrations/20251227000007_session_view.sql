-- View para o Backend Go recuperar rapidamente o perfil e as contas de um usuário
CREATE OR REPLACE VIEW public.view_user_session AS
SELECT
u.id AS user_id,
u.uuid AS supabase_uid,
u.email,
u.name,
u.avatar_url,
u.availability_status,
u.ui_settings,
COALESCE(
jsonb_agg(
jsonb_build_object(
'account_id', a.id,
'account_name', a.name,
'role', au.role,
'status', a.status
)
) FILTER (WHERE a.id IS NOT NULL),
'[]'::jsonb
) AS accounts
FROM public.users u
LEFT JOIN public.account_users au ON u.id = au.user_id
LEFT JOIN public.accounts a ON au.account_id = a.id
GROUP BY u.id;