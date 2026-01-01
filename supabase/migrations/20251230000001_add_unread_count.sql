-- Add unread_count column to conversations table
-- This column tracks the number of unread messages in a conversation

-- Add the column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'conversations'
        AND column_name = 'unread_count'
    ) THEN
        ALTER TABLE conversations
        ADD COLUMN unread_count INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Calculate and populate unread_count for existing conversations
UPDATE conversations c
SET unread_count = (
    SELECT COUNT(*)
    FROM messages m
    WHERE m.conversation_id = c.id
    AND m.message_type = 0  -- incoming messages
    AND m.read_at IS NULL   -- unread
)
WHERE c.id IN (
    SELECT DISTINCT conversation_id
    FROM messages
    WHERE message_type = 0
    AND read_at IS NULL
);

-- Create an index to improve query performance
CREATE INDEX IF NOT EXISTS idx_conversations_unread_count
ON conversations(unread_count)
WHERE unread_count > 0;

-- Add a check constraint to ensure unread_count is never negative
ALTER TABLE conversations
ADD CONSTRAINT chk_conversations_unread_count_positive
CHECK (unread_count >= 0);
