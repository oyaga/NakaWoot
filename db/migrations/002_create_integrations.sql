-- Fixed migration for integrations table
-- accounts.id is BIGINT, not UUID

CREATE TABLE IF NOT EXISTS integrations (
    id BIGSERIAL PRIMARY KEY,
    account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    name VARCHAR(100),
    config JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integrations_account_id ON integrations(account_id);
CREATE INDEX IF NOT EXISTS idx_integrations_provider ON integrations(provider);