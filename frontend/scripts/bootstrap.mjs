import { readFile } from 'node:fs/promises';

// Esta lista é também a ordem de instalação em um Supabase novo. Nenhuma
// migração é reaplicada ao banco operacional por este módulo.
export const arquivosBootstrap = [
 'sql/instalacao/base.sql',
 'sql/migration_fase1.sql',
 'sql/migration_fase1b_cardapio.sql',
 'sql/migration_fase1d_endereco_cliente.sql',
 'sql/migration_fase2_estoque.sql',
 'sql/migration_cadastro_insumos.sql',
 'sql/migration_fase4_5_fundacao_analitica.sql',
 'sql/migration_pedido_transacional.sql',
 'sql/migration_configuracao_entrega.sql',
 'sql/migration_consulta_rotas.sql',
 'supabase/migrations/20261005220617_origem_mapa.sql',
 'supabase/migrations/20261005222321_proteger_views_dashboard.sql',
 'supabase/migrations/20261008010733_frete_no_pedido.sql',
 'supabase/migrations/20261008012909_restringir_escrita_pedidos.sql',
 'supabase/migrations/20261009000030_cancelamento_estorno_estoque.sql',
 'supabase/migrations/20261009001643_corrigir_fatos_cancelados.sql',
 'supabase/migrations/20261017173447_operacao_estoque_segura.sql',
 'supabase/migrations/20261017174630_proteger_acessos_operacionais.sql',
 'sql/edicao_fichas_vigente.sql',
 'supabase/migrations/20261025000912_portal_clientes_convivium.sql',
 'supabase/migrations/20261025004910_empresas_acesso_frete_cliente.sql',
 'supabase/migrations/20261106015840_cadastro_cpf_tempo_real.sql',
 'sql/instalacao/finalizar.sql',
];

export async function fontesBootstrap(){
 return Promise.all(arquivosBootstrap.map(async arquivo=>({arquivo,sql:await readFile(new URL('../../'+arquivo,import.meta.url),'utf8')})));
}
export async function aplicarBootstrap(executar){
 for(const fonte of await fontesBootstrap()){
  try{await executar(fonte.sql)}catch(error){throw new Error(`Falha em ${fonte.arquivo}: ${error.message}`,{cause:error})}
 }
}
