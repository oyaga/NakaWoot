-- Fix unread_count calculation and populate with correct values
-- The unread_count should reflect messages with message_type=0 (incoming) and status != 'read'

-- Step 1: Update all conversations with correct unread_count
UPDATE conversations c
SET unread_count = (
    SELECT COUNT(*)
    FROM messages m
    WHERE m.conversation_id = c.id
    AND m.message_type = 0  -- incoming messages
    AND (m.status IS NULL OR m.status != 'read')  -- not read
)
WHERE c.id IN (
    SELECT DISTINCT conversation_id
    FROM messages
    WHERE message_type = 0
    AND (status IS NULL OR status != 'read')
);

-- Step 2: Create a function to automatically update unread_count when messages change
CREATE OR REPLACE FUNCTION update_conversation_unread_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update unread count for the affected conversation
    UPDATE conversations
    SET unread_count = (
        SELECT COUNT(*)
        FROM messages
        WHERE conversation_id = COALESCE(NEW.conversation_id, OLD.conversation_id)
        AND message_type = 0  -- incoming messages
        AND (status IS NULL OR status != 'read')
    ),
    updated_at = NOW()
    WHERE id = COALESCE(NEW.conversation_id, OLD.conversation_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create triggers to automatically update unread_count
DROP TRIGGER IF EXISTS trg_update_unread_on_insert ON messages;
CREATE TRIGGER trg_update_unread_on_insert
    AFTER INSERT ON messages
    FOR EACH ROW
    WHEN (NEW.message_type = 0)  -- Only for incoming messages
    EXECUTE FUNCTION update_conversation_unread_count();

DROP TRIGGER IF EXISTS trg_update_unread_on_update ON messages;
CREATE TRIGGER trg_update_unread_on_update
    AFTER UPDATE ON messages
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.message_type IS DISTINCT FROM NEW.message_type)
    EXECUTE FUNCTION update_conversation_unread_count();

DROP TRIGGER IF EXISTS trg_update_unread_on_delete ON messages;
CREATE TRIGGER trg_update_unread_on_delete
    AFTER DELETE ON messages
    FOR EACH ROW
    WHEN (OLD.message_type = 0)
    EXECUTE FUNCTION update_conversation_unread_count();

-- Step 4: Add index to improve query performance
CREATE INDEX IF NOT EXISTS idx_messages_unread_lookup
ON messages(conversation_id, message_type, status)
WHERE message_type = 0;

-- Step 5: Verify the update
DO $$
DECLARE
    fixed_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO fixed_count
    FROM conversations
    WHERE unread_count > 0;

    RAISE NOTICE 'Fixed % conversations with unread messages', fixed_count;
END $$;
