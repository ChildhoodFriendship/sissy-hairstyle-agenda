import { InjectionToken } from '@angular/core';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseRuntimeConfig {
  url: string;
  publishableKey: string;
}

export const SUPABASE_RUNTIME_CONFIG = new InjectionToken<SupabaseRuntimeConfig>('SUPABASE_RUNTIME_CONFIG');
export const SUPABASE_CLIENT = new InjectionToken<SupabaseClient | null>('SUPABASE_CLIENT');

export function createSupabaseClient(config: SupabaseRuntimeConfig): SupabaseClient | null {
  if (!config.url || !config.publishableKey) return null;
  return createClient(config.url, config.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
}
