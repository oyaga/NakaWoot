-- Tabela de API Tokens para integrações
CREATE TABLE IF NOT EXISTS public.api_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    account_id INTEGER NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Índices para performance
CREATE INDEX idx_api_tokens_user_id ON public.api_tokens(user_id);
CREATE INDEX idx_api_tokens_account_id ON public.api_tokens(account_id);
CREATE INDEX idx_api_tokens_token ON public.api_tokens(token);

-- RLS Policies
ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver seus próprios tokens
CREATE POLICY "Users can view their own API tokens"
ON public.api_tokens
FOR SELECT
USING (
    user_id IN (
        SELECT id FROM public.users WHERE uuid = auth.uid()
    )
);

-- Usuários podem criar tokens
CREATE POLICY "Users can create their own API tokens"
ON public.api_tokens
FOR INSERT
WITH CHECK (
    user_id IN (
        SELECT id FROM public.users WHERE uuid = auth.uid()
    )
);

-- Usuários podem deletar seus próprios tokens
CREATE POLICY "Users can delete their own API tokens"
ON public.api_tokens
FOR DELETE
USING (
    user_id IN (
        SELECT id FROM public.users WHERE uuid = auth.uid()
    )
);

-- Comentários
COMMENT ON TABLE public.api_tokens IS 'Tokens de API para integrações externas';
COMMENT ON COLUMN public.api_tokens.name IS 'Nome descritivo do token';
COMMENT ON COLUMN public.api_tokens.token IS 'Token de autenticação (base64)';
COMMENT ON COLUMN public.api_tokens.expires_at IS 'Data de expiração do token (null = nunca expira)';
COMMENT ON COLUMN public.api_tokens.last_used_at IS 'Última vez que o token foi usado';
