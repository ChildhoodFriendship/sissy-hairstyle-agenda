import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app.component';
import { createSupabaseClient, SUPABASE_CLIENT, SUPABASE_RUNTIME_CONFIG, type SupabaseRuntimeConfig } from './app/api/supabase-client';

const defaultConfig: SupabaseRuntimeConfig = {
  url: 'https://jawxcjkheoarslyvupir.supabase.co',
  publishableKey: '',
};

async function loadSupabaseConfig(): Promise<SupabaseRuntimeConfig> {
  try {
    const response = await fetch('/supabase-config.json', { cache: 'no-store' });
    if (!response.ok) return defaultConfig;
    const value: unknown = await response.json();
    if (!value || typeof value !== 'object') return defaultConfig;
    const config = value as Partial<SupabaseRuntimeConfig>;
    return {
      url: typeof config.url === 'string' ? config.url : defaultConfig.url,
      publishableKey: typeof config.publishableKey === 'string' ? config.publishableKey : '',
    };
  } catch {
    return defaultConfig;
  }
}

void loadSupabaseConfig().then((config) => bootstrapApplication(App, {
  ...appConfig,
  providers: [
    ...appConfig.providers,
    { provide: SUPABASE_RUNTIME_CONFIG, useValue: config },
    { provide: SUPABASE_CLIENT, useFactory: () => createSupabaseClient(config) },
  ],
}).catch((error) => console.error(error)));
