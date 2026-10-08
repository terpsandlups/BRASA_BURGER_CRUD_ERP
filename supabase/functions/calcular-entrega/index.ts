import { createClient } from 'npm:@supabase/supabase-js@2.45.0'
import { criarHandler } from './handler.mjs'

// Chave privilegiada permanece somente na Edge Function; o navegador não pode
// criar cotações nem escolher o valor a ser gravado no pedido.
const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}')
const chaveServico = secretKeys.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

Deno.serve(criarHandler({
  // MVP gratuito: nenhuma chave Google é lida e não existe fallback pago.
  provider: 'openrouteservice',
  apiKey: Deno.env.get('ORS_API_KEY'),
  allowedOrigins: (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map(s => s.trim()).filter(Boolean),
  criarCliente: (authorization: string) => createClient(
    Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } },
  ),
  salvarCotacao: async (cotacao: Record<string, unknown>) => {
    if (!chaveServico) throw new Error('Chave interna indisponível')
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, chaveServico,
      { auth: { persistSession: false, autoRefreshToken: false } })
    const { data, error } = await admin.from('cotacoes_entrega').insert({
      usuario_id: cotacao.usuarioId, loja_id: cotacao.lojaId, cliente_cpf: cotacao.clienteCpf,
      origem: cotacao.origem, destino: cotacao.destino,
      distancia_metros: cotacao.distanciaMetros, valor_km: cotacao.valorKm,
      taxa: cotacao.taxa, provedor: cotacao.provedor,
    }).select('id, expira_em').single()
    if (error) throw error
    return { id: data.id, expiraEm: data.expira_em }
  },
}))
