import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Account } from '@/types/auth';

interface AuthState {
user: User | null;
accounts: Account[];
currentAccount: Account | null;
token: string | null;
setUser: (user: User | null) => void;
setToken: (token: string | null) => void;
setAccounts: (accounts: Account[]) => void;
setCurrentAccount: (account: Account | null) => void;
logout: () => void;
}

export const useAuthStore = create<AuthState>()(
persist(
(set) => ({
user: null,
accounts: [],
currentAccount: null,
token: null,
setUser: (user) => set({ user }),
setToken: (token) => set({ token }),
setAccounts: (accounts) => set({ accounts }),
setCurrentAccount: (account) => set({ currentAccount: account }),
logout: () => set({ user: null, token: null, accounts: [], currentAccount: null }),
}),
{
name: 'mensager-auth',
}
)
);