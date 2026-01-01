'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const session = useAuthStore((state) => state.session);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const isAuthCheckComplete = useAuthStore((state) => state.isAuthCheckComplete);
  const router = useRouter();

  useEffect(() => {
    // Only redirect if:
    // 1. Storage hydration is done
    // 2. Supabase initial check is done
    // 3. We still have no session
    if (hasHydrated && isAuthCheckComplete && !session) {
      router.push('/login');
    }
  }, [session, hasHydrated, isAuthCheckComplete, router]);

  // Show loader while waiting for either hydration or initial auth check
  // Exception: If we already have a session from hydration, we can render immediately
  if (!session && (!hasHydrated || !isAuthCheckComplete)) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-blue-500" />
          <p className="text-sm font-medium">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // If we have a session, render children immediately (optimistic UI)
  // Or if everything checked and no session (useEffect will redirect, but we return null here to avoid flash)
  if (!session) return null;

  return <>{children}</>;
}