import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Session } from '@supabase/supabase-js';

interface Profile {
  id: string;
  name: string;
  avatar_url: string;
  account_id: number;
}

interface Account {
  id: number;
  name: string;
}

interface ExtendedUser extends User {
  account_users?: Array<{ account: Account }>;
}

interface AuthState {
  user: ExtendedUser | null;
  session: Session | null;
  profile: Profile | null;
  currentAccount: Account | null;
  isLoading: boolean;
  _hasHydrated: boolean;
  isAuthCheckComplete: boolean;
  setUser: (user: ExtendedUser | null) => void;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setCurrentAccount: (account: Account | null) => void;
  setHasHydrated: (state: boolean) => void;
  setAuthCheckComplete: (state: boolean) => void;
  fetchProfile: () => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      profile: null,
      currentAccount: null,
      isLoading: false,
      _hasHydrated: false,
      isAuthCheckComplete: false,
      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setProfile: (profile) => set({ profile }),
      setCurrentAccount: (currentAccount) => set({ currentAccount }),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
      setAuthCheckComplete: (state) => set({ isAuthCheckComplete: state }),
      fetchProfile: async () => {
        const { user } = get();
        if (!user) return;

        set({ isLoading: true });
        try {
          // In a real app, this would fetch from your backend/Supabase
          // For now, we'll use user metadata as profile
          const profile: Profile = {
            id: user.id,
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
            avatar_url: user.user_metadata?.avatar_url || '',
            account_id: user.user_metadata?.account_id || 0,
          };
          set({ profile });
        } finally {
          set({ isLoading: false });
        }
      },
      logout: () => set({ user: null, session: null, profile: null, currentAccount: null }),
    }),
    {
      name: 'mensager-auth',
      version: 1, // Invalidate old storage to prevent zombie sessions
      partialize: (state) => ({
        currentAccount: state.currentAccount,
        profile: state.profile,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
