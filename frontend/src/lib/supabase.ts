import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Verificar se estamos no browser para usar localStorage
const isBrowser = typeof window !== 'undefined';

// Custom storage para debug
const customStorage = {
  getItem: (key: string) => {
    if (!isBrowser) return null;
    const value = localStorage.getItem(key);
    console.log(`[Supabase Storage] getItem(${key}):`, value ? 'found (' + value.length + ' chars)' : 'null');
    return value;
  },
  setItem: (key: string, value: string) => {
    if (!isBrowser) return;
    console.log(`[Supabase Storage] setItem(${key}):`, value.length, 'chars');
    localStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (!isBrowser) return;
    console.log(`[Supabase Storage] removeItem(${key})`);
    localStorage.removeItem(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: customStorage,
    storageKey: 'sb-mensager-auth-token', // Key explícita para evitar conflitos
  }
});

// Log de debug na inicialização
if (isBrowser) {
  console.log('[Supabase] Client initialized');
  console.log('[Supabase] URL:', supabaseUrl);
  console.log('[Supabase] Checking existing storage keys...');
  
  // Listar todas as chaves do localStorage relacionadas ao Supabase
  const supabaseKeys = Object.keys(localStorage).filter(k => 
    k.includes('supabase') || k.includes('sb-') || k.includes('mensager')
  );
  console.log('[Supabase] Found storage keys:', supabaseKeys);
}