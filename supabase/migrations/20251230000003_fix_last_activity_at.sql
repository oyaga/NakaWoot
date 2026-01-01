-- Fix last_activity_at for conversations
-- Populate last_activity_at based on the most recent message timestamp

-- Update conversations with NULL last_activity_at
UPDATE conversations c
SET
    last_activity_at = (
        SELECT MAX(m.created_at)
        FROM messages m
        WHERE m.conversation_id = c.id
    ),
    updated_at = NOW()
WHERE c.last_activity_at IS NULL
AND EXISTS (
    SELECT 1
    FROM messages m
    WHERE m.conversation_id = c.id
);

-- Also update conversations where last_activity_at is older than the most recent message
UPDATE conversations c
SET
    last_activity_at = (
        SELECT MAX(m.created_at)
        FROM messages m
        WHERE m.conversation_id = c.id
    ),
    updated_at = NOW()
WHERE c.last_activity_at < (
    SELECT MAX(m.created_at)
    FROM messages m
    WHERE m.conversation_id = c.id
);

-- Create a function to automatically update last_activity_at when messages are added
CREATE OR REPLACE FUNCTION update_conversation_last_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Update last_activity_at for the affected conversation
    UPDATE conversations
    SET
        last_activity_at = NEW.created_at,
        updated_at = NOW()
    WHERE id = NEW.conversation_id
    AND (last_activity_at IS NULL OR last_activity_at < NEW.created_at);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update last_activity_at on new messages
DROP TRIGGER IF EXISTS trg_update_last_activity_on_insert ON messages;
CREATE TRIGGER trg_update_last_activity_on_insert
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_last_activity();

-- Add index to improve query performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
ON messages(conversation_id, created_at DESC);

-- Verify the update
DO $$
DECLARE
    fixed_count INTEGER;
    null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO fixed_count
    FROM conversations
    WHERE last_activity_at IS NOT NULL;

    SELECT COUNT(*) INTO null_count
    FROM conversations
    WHERE last_activity_at IS NULL;

    RAISE NOTICE 'Conversations with last_activity_at: %', fixed_count;
    RAISE NOTICE 'Conversations with NULL last_activity_at: %', null_count;
END $$;
