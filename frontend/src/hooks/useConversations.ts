import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Conversation } from '@/types/conversation';

export function useConversations(accountId: number) {
return useQuery({
queryKey: ['conversations', accountId],
queryFn: async () => {
const { data } = await api.get<Conversation[]>(`/accounts/${accountId}/conversations`);
return data;
},
enabled: !!accountId,
});
}