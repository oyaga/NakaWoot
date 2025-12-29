import { createClient, SupabaseClient } from '@supabase/supabase-js';

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
    console.log(`[Supabase Storage] removeItem(${key})`)
    localStorage.removeItem(key);
  },
};

// Lazy initialization - client só é criado quando acessado no browser
let _supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (_supabase) return _supabase;
  
  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  let supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  // Fallback: se não tiver URL configurada, derivar do hostname atual
  if (!supabaseUrl && isBrowser) {
    const hostname = window.location.hostname;
    
    // Mapeamento de domínios conhecidos
    if (hostname.includes('aikanakamura.com')) {
      supabaseUrl = 'https://banker.aikanakamura.com';
      supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzE1MDUwODAwLAogICJleHAiOiAxODcyODE3MjAwCn0.p97SPDUBrtdz7FOYcnCWcsSp0a2ebATVgbNM9xOy4Xg';
      console.log('[Supabase] Using runtime fallback URL for aikanakamura.com domain');
    } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
      supabaseUrl = 'http://localhost:8000';
      supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzE1MDUwODAwLAogICJleHAiOiAxODcyODE3MjAwCn0.p97SPDUBrtdz7FOYcnCWcsSp0a2ebATVgbNM9xOy4Xg';
      console.log('[Supabase] Using localhost fallback URL for development');
    }
  }
  
  // Se ainda não tiver URL (SSR ou hostname desconhecido), usar placeholder
  if (!supabaseUrl) {
    console.warn('[Supabase] URL not configured, using placeholder');
    _supabase = createClient('https://placeholder.supabase.co', 'placeholder-key', {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });
    return _supabase;
  }
  
  _supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: customStorage,
      storageKey: 'sb-mensager-auth-token',
    }
  });
  
  // Log de debug na inicialização
  if (isBrowser) {
    console.log('[Supabase] Client initialized');
    console.log('[Supabase] URL:', supabaseUrl);
    console.log('[Supabase] Checking existing storage keys...');
    
    const supabaseKeys = Object.keys(localStorage).filter(k => 
      k.includes('supabase') || k.includes('sb-') || k.includes('mensager')
    );
    console.log('[Supabase] Found storage keys:', supabaseKeys);
  }
  
  return _supabase;
}

// Export como getter para lazy initialization
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop: keyof SupabaseClient) {
    const client = getSupabaseClient();
    const value = client[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
});