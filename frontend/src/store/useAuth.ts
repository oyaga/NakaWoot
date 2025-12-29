import { create } from 'zustand';

interface User {
id: string;
email: string;
name?: string;
}

interface AuthState {
user: User | null;
setUser: (user: User | null) => void;
isLoading: boolean;
}

export const useAuthStore = create<AuthState>((set) => ({
user: null,
isLoading: true,
setUser: (user) => set({ user, isLoading: false }),
}));