import { createClient } from '@supabase/supabase-js'
import { opcoesSessao } from './sessoesAplicacoes.js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, opcoesSessao('erp', window.location.pathname, import.meta.env.BASE_URL))
