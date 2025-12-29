-- Migration: 20251228000002_fix_contact_deletion.sql
-- Description: Ensures correct cascade deletion for contacts and cleans up redundant columns

BEGIN;

-- 1. Remove contact_id from messages if it exists (legacy column)
-- Since messages are linked to conversations, and conversations to contacts, 
-- a direct link in messages is redundant and can block deletion if not cascaded.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='contact_id') THEN
        ALTER TABLE public.messages DROP COLUMN contact_id;
    END IF;
END $$;

-- 2. Ensure Cascade on Conversations -> Contacts
-- If the constraint exists but doesn't have CASCADE, we drop and recreate it.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='conversations_contact_id_fkey') THEN
        ALTER TABLE public.conversations DROP CONSTRAINT conversations_contact_id_fkey;
    END IF;
END $$;

ALTER TABLE public.conversations
    ADD CONSTRAINT conversations_contact_id_fkey
    FOREIGN KEY (contact_id)
    REFERENCES public.contacts(id)
    ON DELETE CASCADE;

-- 3. Ensure Cascade on Messages -> Conversations
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='messages_conversation_id_fkey') THEN
        ALTER TABLE public.messages DROP CONSTRAINT messages_conversation_id_fkey;
    END IF;
END $$;

ALTER TABLE public.messages
    ADD CONSTRAINT messages_conversation_id_fkey
    FOREIGN KEY (conversation_id)
    REFERENCES public.conversations(id)
    ON DELETE CASCADE;

-- 4. Ensure Cascade on Messages -> Account (Optional but good practice)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='messages_account_id_fkey') THEN
        ALTER TABLE public.messages DROP CONSTRAINT messages_account_id_fkey;
    END IF;
END $$;

ALTER TABLE public.messages
    ADD CONSTRAINT messages_account_id_fkey
    FOREIGN KEY (account_id)
    REFERENCES public.accounts(id)
    ON DELETE CASCADE;

COMMIT;
