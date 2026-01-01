import { createBrowserClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';

// Verificar se estamos no browser
const isBrowser = typeof window !== 'undefined';

// Lazy initialization - client só é criado quando acessado
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
    } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
      supabaseUrl = 'http://localhost:8000';
      supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogImFub24iLAogICJpc3MiOiAic3VwYWJhc2UiLAogICJpYXQiOiAxNzE1MDUwODAwLAogICJleHAiOiAxODcyODE3MjAwCn0.p97SPDUBrtdz7FOYcnCWcsSp0a2ebATVgbNM9xOy4Xg';
    }
  }
  
  // Se ainda não tiver URL, usar placeholder (evitar crash)
  if (!supabaseUrl) {
    console.warn('[Supabase] URL not configured');
    return createBrowserClient(
      'https://placeholder.supabase.co',
      'placeholder-key'
    );
  }
  
  // Usar createBrowserClient do SSR que gerencia cookies automaticamente
  _supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true, // SSR precisa de refresh token
      detectSessionInUrl: true,
    }
  });
  
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