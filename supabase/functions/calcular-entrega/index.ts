import { createClient } from 'npm:@supabase/supabase-js@2.45.0'
import { criarHandler } from './handler.mjs'

Deno.serve(criarHandler({
  // MVP gratuito: nenhuma chave Google é lida e não existe fallback pago.
  provider: 'openrouteservice',
  apiKey: Deno.env.get('ORS_API_KEY'),
  allowedOrigins: (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map(s => s.trim()).filter(Boolean),
  criarCliente: (authorization: string) => createClient(
    Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } },
  ),
}))
