-- Migration: Create messages table
-- Description: Adds the messages table for storing all chat messages
-- with full WhatsApp/Evolution integration support

CREATE TABLE IF NOT EXISTS messages (
    id BIGSERIAL PRIMARY KEY,
    content TEXT,
    account_id BIGINT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    inbox_id BIGINT NOT NULL REFERENCES inboxes(id) ON DELETE CASCADE,
    conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    message_type INTEGER NOT NULL DEFAULT 0,  -- 0=incoming, 1=outgoing, 2=activity, 3=template
    content_type VARCHAR(50) DEFAULT 'text',  -- text, image, video, audio, file, location, contact
    private BOOLEAN DEFAULT FALSE,
    sender_type VARCHAR(50),  -- User, Contact
    sender_id BIGINT,
    status INTEGER DEFAULT 0,  -- 0=sent, 1=delivered, 2=read, 3=failed
    
    -- WhatsApp/Evolution specific fields
    source_id VARCHAR(255),
    external_source_ids JSONB,
    whatsapp_message_id VARCHAR(255) UNIQUE,
    remote_jid VARCHAR(255),
    push_name VARCHAR(255),
    is_from_me BOOLEAN DEFAULT FALSE,
    is_group BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP WITH TIME ZONE,
    quoted_message_id VARCHAR(255),
    
    -- Media fields
    media_url TEXT,
    mime_type VARCHAR(100),
    file_name VARCHAR(255),
    file_size BIGINT,
    caption TEXT,
    
    -- Additional data
    group_data JSONB,
    metadata JSONB,
    revoked BOOLEAN DEFAULT FALSE,
    edited BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_inbox_id ON messages(inbox_id);
CREATE INDEX IF NOT EXISTS idx_messages_account_id ON messages(account_id);
CREATE INDEX IF NOT EXISTS idx_messages_source_id ON messages(source_id);
CREATE INDEX IF NOT EXISTS idx_messages_remote_jid ON messages(remote_jid);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);

-- Add new columns to conversations if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'conversations' AND column_name = 'unread_count') THEN
        ALTER TABLE conversations ADD COLUMN unread_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'conversations' AND column_name = 'last_activity_at') THEN
        ALTER TABLE conversations ADD COLUMN last_activity_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Add identifier column to contacts if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'contacts' AND column_name = 'identifier') THEN
        ALTER TABLE contacts ADD COLUMN identifier VARCHAR(255);
        CREATE INDEX IF NOT EXISTS idx_contacts_identifier ON contacts(identifier);
    END IF;
END $$;
