import { createClient } from '@supabase/supabase-js'
import { opcoesSessao } from './sessoesAplicacoes.js'

// Aplicações paralelas: sair da conta de consumidor não encerra o ERP.
// O token da equipe continua no armazenamento padrão do cliente existente.
export const supabasePortal = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  opcoesSessao('consumidor', window.location.pathname, import.meta.env.BASE_URL),
)
