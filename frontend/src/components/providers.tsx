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

    // Restaurar sessão do Supabase ao carregar
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('[AuthProvider] Error getting session:', error);
      } 
      
      if (session) {
        setSession(session);
        setUser(session.user as ExtendedUser);
      } else {
        // Fallback: Verificar localStorage manualmente (para login via backend local)
        let foundLocal = false;
        try {
           const localData = localStorage.getItem('sb-mensager-auth-token');
           if (localData) {
              const fakeSession = JSON.parse(localData);
              if (fakeSession && fakeSession.access_token) {
                 setSession(fakeSession);
                 setUser(fakeSession.user as ExtendedUser);
                 foundLocal = true;
              }
           }
        } catch(e) {
          console.warn('[AuthProvider] Error parsing local session:', e);
        }

        if (!foundLocal) {
          setSession(null);
          setUser(null);
        }
      }
    }).finally(() => {
      setAuthCheckComplete(true);
    });

    // Escutar mudanças na autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      
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
        enableSystem
        themes={['light', 'dark', 'midnight', 'forest', 'system']}
        disableTransitionOnChange
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}