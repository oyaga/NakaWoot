-- 1. Garantir que não existam mensagens duplicadas vindas da API externa
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS source_id TEXT;

-- Índice para busca rápida de duplicatas e restrição de unicidade
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_source_id_account ON public.messages(source_id, account_id)
WHERE source_id IS NOT NULL;

-- 2. Função para Marcar Todas as Mensagens de uma Conversa como Lidas
-- Isso será chamado pelo Backend Go quando o agente abrir o chat
CREATE OR REPLACE FUNCTION public.mark_messages_as_read(p_conversation_id INTEGER)
RETURNS void AS $$
BEGIN
UPDATE public.messages
SET status = 'read'
WHERE conversation_id = p_conversation_id
AND message_type = 0 -- Apenas mensagens recebidas (incoming)
AND status != 'read';

-- Atualizar o timestamp da conversa para forçar refresh no Realtime se necessário
UPDATE public.conversations
SET updated_at = NOW()
WHERE id = p_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Adicionar coluna para armazenar o ID da mensagem na Evolution API
-- Útil para futuras ações como 'deletar mensagem' ou 'reagir'
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS external_id TEXT;