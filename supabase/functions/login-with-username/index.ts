import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return response({ error: 'Richiesta non valida.' }, 405);

  try {
    const { username, password } = await request.json();
    const normalizedUsername = typeof username === 'string' ? username.trim().toLowerCase() : '';
    if (!/^[a-z0-9_.-]{3,30}$/.test(normalizedUsername) || typeof password !== 'string') {
      return response({ error: 'Username o password non validi.' }, 400);
    }

    const url = Deno.env.get('SUPABASE_URL');
    const anonKey = request.headers.get('apikey') || Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !anonKey || !serviceRoleKey) return response({ error: 'Servizio di accesso non configurato.' }, 500);

    const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: profile, error: profileError } = await admin
      .from('user_profiles')
      .select('email')
      .eq('username', normalizedUsername)
      .maybeSingle();
    if (profileError || !profile?.email) return response({ error: 'Username o password non validi.' }, 401);

    const auth = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await auth.auth.signInWithPassword({ email: profile.email, password });
    if (error || !data.session) return response({ error: 'Username o password non validi.' }, 401);
    return response({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
  } catch {
    return response({ error: 'Impossibile completare l’accesso.' }, 400);
  }
});

function response(body: Record<string, string>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
