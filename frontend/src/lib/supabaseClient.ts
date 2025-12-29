import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
throw new Error("Missing env NEXT_PUBLIC_SUPABASE_URL");
}
if (!supabaseAnonKey) {
throw new Error("Missing env NEXT_PUBLIC_SUPABASE_ANON_KEY (anon public key)");
}

if (!client) {
client = createClient(supabaseUrl, supabaseAnonKey);
}

return client;
}