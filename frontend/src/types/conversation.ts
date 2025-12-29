export type ConversationStatus = 'open' | 'resolved' | 'pending' | 'snoozed';
export type ConversationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Contact {
  id: number;
  name: string;
  avatar_url?: string;
  email?: string;
  phone_number?: string;
}

export interface Message {
  id: number;
  content: string;
  message_type: 'incoming' | 'outgoing';
  created_at: string;
  conversation_id: number;
  sender_id?: number;
  attachments?: unknown[];
}

export interface Conversation {
  id: number;
  display_id: number; // Identificador amigável (#123)
  status: ConversationStatus;
  priority?: ConversationPriority;
  contact: Contact;
  inbox_id: number;
  assignee_id?: number;
  last_activity_at: string;
  last_message?: {
    content: string;
    created_at: string;
  };
}