import { create } from 'zustand';
import { Message, Conversation } from '@/types/conversation';

interface ChatState {
conversations: Conversation[];
activeConversationId: number | null;
addMessage: (conversationId: number, message: Message) => void;
updateConversation: (conversation: Partial<Conversation>) => void;
setConversations: (conversations: Conversation[]) => void;
}

export const useChatStore = create<ChatState>((set) => ({
conversations: [],
activeConversationId: null,
setConversations: (conversations) => set({ conversations }),
addMessage: (conversationId, message) => set((state) => ({
conversations: state.conversations.map(c =>
c.id === conversationId
? { ...c, last_message: { content: message.content, created_at: message.created_at } }
: c
)
})),
updateConversation: (updatedConv) => set((state) => ({
conversations: state.conversations.map(c =>
c.id === updatedConv.id ? { ...c, ...updatedConv } : c
)
})),
}));