-- Migration: Add WhatsApp/Evolution fields to existing messages table
-- Description: Adds WhatsApp-specific fields to messages table without recreating it

-- Add WhatsApp/Evolution fields to messages table if they don't exist
DO $$
BEGIN
    -- Content type field
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'messages' AND column_name = 'content_type') THEN
        ALTER TABLE messages ADD COLUMN content_type VARCHAR(50) DEFAULT 'text';
    END IF;

    -- WhatsApp message ID (unique identifier)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'messages' AND column_name = 'whatsapp_message_id') THEN
        ALTER TABLE messages ADD COLUMN whatsapp_message_id VARCHAR(255) UNIQUE;
    END IF;

    -- Remote JID (WhatsApp chat identifier)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'messages' AND column_name = 'remote_jid') THEN
        ALTER TABLE messages ADD COLUMN remote_jid VARCHAR(255);
        CREATE INDEX IF NOT EXISTS idx_messages_remote_jid ON messages(remote_jid);
    END IF;

    -- Push name (contact name from WhatsApp)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'messages' AND column_name = 'push_name') THEN
        ALTER TABLE messages ADD COLUMN push_name VARCHAR(255);
    END IF;

    -- Is from me flag
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'messages' AND column_name = 'is_from_me') THEN
        ALTER TABLE messages ADD COLUMN is_from_me BOOLEAN DEFAULT FALSE;
    END IF;

    -- Is group flag
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'messages' AND column_name = 'is_group') THEN
        ALTER TABLE messages ADD COLUMN is_group BOOLEAN DEFAULT FALSE;
    END IF;

    -- Timestamp from WhatsApp
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'messages' AND column_name = 'timestamp') THEN
        ALTER TABLE messages ADD COLUMN timestamp TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Quoted message ID (for replies)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'messages' AND column_name = 'quoted_message_id') THEN
        ALTER TABLE messages ADD COLUMN quoted_message_id VARCHAR(255);
    END IF;

    -- Media URL
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'messages' AND column_name = 'media_url') THEN
        ALTER TABLE messages ADD COLUMN media_url TEXT;
    END IF;

    -- MIME type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'messages' AND column_name = 'mime_type') THEN
        ALTER TABLE messages ADD COLUMN mime_type VARCHAR(100);
    END IF;

    -- File name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'messages' AND column_name = 'file_name') THEN
        ALTER TABLE messages ADD COLUMN file_name VARCHAR(255);
    END IF;

    -- File size
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'messages' AND column_name = 'file_size') THEN
        ALTER TABLE messages ADD COLUMN file_size BIGINT;
    END IF;

    -- Caption for media
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'messages' AND column_name = 'caption') THEN
        ALTER TABLE messages ADD COLUMN caption TEXT;
    END IF;

    -- Group data JSON
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'messages' AND column_name = 'group_data') THEN
        ALTER TABLE messages ADD COLUMN group_data JSONB;
    END IF;

    -- External source IDs
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'messages' AND column_name = 'external_source_ids') THEN
        ALTER TABLE messages ADD COLUMN external_source_ids JSONB;
    END IF;

    -- Revoked flag
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'messages' AND column_name = 'revoked') THEN
        ALTER TABLE messages ADD COLUMN revoked BOOLEAN DEFAULT FALSE;
    END IF;

    -- Edited flag
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'messages' AND column_name = 'edited') THEN
        ALTER TABLE messages ADD COLUMN edited BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add fields to conversations table
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

-- Add identifier column to contacts
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'contacts' AND column_name = 'identifier') THEN
        ALTER TABLE contacts ADD COLUMN identifier VARCHAR(255);
        CREATE INDEX IF NOT EXISTS idx_contacts_identifier ON contacts(identifier);
    END IF;
END $$;
