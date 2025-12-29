'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/useAuthStore';
import { User } from '@supabase/supabase-js';

interface ExtendedUser extends User {
  account_users?: Array<{ account: { id: number; name: string } }>;
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const setSession = useAuthStore((state) => state.setSession);
  const setUser = useAuthStore((state) => state.setUser);
  const setAuthCheckComplete = useAuthStore((state) => state.setAuthCheckComplete);
  const initialCheckDone = useRef(false);

  useEffect(() => {
    // Evitar dupla execução em Strict Mode
    if (initialCheckDone.current) return;
    initialCheckDone.current = true;

    console.log('[AuthProvider] Starting session restoration...');
    
    // Restaurar sessão do Supabase ao carregar
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('[AuthProvider] Error getting session:', error);
      } else if (session) {
        console.log('[AuthProvider] Restored session from Supabase storage:', session.user?.email);
        console.log('[AuthProvider] Token expires at:', new Date(session.expires_at! * 1000).toISOString());
        setSession(session);
        setUser(session.user as ExtendedUser);
      } else {
        console.log('[AuthProvider] No session found in Supabase storage');
      }
    }).finally(() => {
      console.log('[AuthProvider] Initial auth check complete');
      setAuthCheckComplete(true);
    });

    // Escutar mudanças na autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AuthProvider] Auth state changed:', event, session?.user?.email);
      
      // Ignorar INITIAL_SESSION já que já tratamos acima
      if (event === 'INITIAL_SESSION') {
        return;
      }
      
      if (session) {
        setSession(session);
        setUser(session.user as ExtendedUser);
      } else {
        setSession(null);
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [setSession, setUser, setAuthCheckComplete]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        disableTransitionOnChange
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}