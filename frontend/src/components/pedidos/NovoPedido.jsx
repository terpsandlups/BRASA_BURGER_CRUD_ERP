import { useEffect, useId, useMemo, useRef } from 'react'
import Icon from '../ui/Icon.jsx'
import CamposEndereco from '../CamposEndereco.jsx'
import ConsultaEntrega from '../ConsultaEntrega.jsx'
import { dinheiro } from '../../lib/pedidoApresentacao.js'
import { calcularPrecoCanal } from '../../lib/pedidoTransacional.js'
import { formatarCPF, formatarTelefone } from '../../lib/format.js'
import { filtrarCardapio, pendenciaConclusao } from '../../lib/cardapioPedido.js'
import './novoPedido.css'

function Segmento({ ativo, children, ...props }) {
  return <button type="button" aria-pressed={ativo} className="order-segment" {...props}>{children}</button>
}

export default function NovoPedido({ catalogo, cliente, atendimento, carrinho, pagamento, envio, observacoes, onObservacoes }) {
  const id = useId()
  const composerRef = useRef(null)
  useEffect(() => { composerRef.current?.scrollIntoView({ block: 'start' }) }, [])
  const { produtos, variacoes, categorias, configCanais, canalVenda, onCanal, categoria, onCategoria, busca, onBusca } = catalogo
  const { lojaId, lojas, onLoja, loja, somenteDelivery, tipo, onTipo, freteObrigatorio, cotacaoAtiva, cotacao, onCotacao, onInvalidar } = atendimento
  const { cpf, onCpf, inputRef, status, encontrado, cadastrando, nome, onNome, telefone, onTelefone, telefoneRef, endereco, onEndereco, onCadastrar, onTentar } = cliente
  const { itens, onAdicionar, onRemover, setItens, valorItem, subtotal, frete, total, adicionaisDoProduto, adicionalAberto, onAdicionalAberto, onAdicional } = carrinho
  const { forma, onForma, troco, onTroco } = pagamento
  const { enviando, pendente, erro, onConcluir } = envio
  const grupos = useMemo(() => filtrarCardapio({ produtos, variacoes, categorias, tipoAtendimento: tipo, categoria, termo: busca }), [produtos, variacoes, categorias, tipo, categoria, busca])
  const quantidadeProdutos = grupos.reduce((soma, grupo) => soma + grupo.itens.length, 0)
  const quantidadeCarrinho = itens.reduce((soma, item) => soma + (Number(item.quantidade) || 0), 0)
  const markup = configCanais.find(c => c.canal_venda === canalVenda)?.markup_preco_percentual || 0
  const pendencia = pendenciaConclusao({ lojaId, cliente: encontrado, itens, pagamento: forma, freteObrigatorio, cotacaoAtiva, trocoPara: troco, total })
  const alterarQuantidade = (idx, quantidade) => setItens(atuais => atuais.map((item, j) => j === idx ? { ...item, quantidade } : item))

  return <section ref={composerRef} className="order-composer" aria-labelledby={`${id}-titulo`}>
    <div className="composer-heading">
      <div className="composer-heading-title"><span className="composer-heading-icon"><Icon nome="mais" /></span><div><h2 id={`${id}-titulo`}>Novo pedido</h2><p>Monte o pedido e envie para a cozinha.</p></div></div>
      <span className="composer-draft"><span /> Rascunho · ainda não enviado</span>
    </div>
    {erro && <p role="alert" className="composer-alert">{erro}</p>}
    {pendente && <div role="alert" className="composer-alert"><p>Envio aguardando confirmação. Recupere o mesmo pedido antes de iniciar outro.</p><button type="button" className="composer-primary" onClick={onConcluir} disabled={enviando}>{enviando ? 'Confirmando…' : 'Confirmar envio anterior'}</button></div>}

    <fieldset disabled={enviando || pendente} className="composer-grid">
      <section className="order-catalog" aria-label="Cardápio de produtos">
        <div className="catalog-toolbar">
          <div className="section-heading"><div><span className="composer-eyebrow">Escolha os produtos</span><h3>Cardápio</h3></div><div className="catalog-quick-actions"><span className="composer-count">{quantidadeProdutos} {quantidadeProdutos === 1 ? 'opção' : 'opções'}</span><a className="catalog-cart-link" href={`#${id}-carrinho`}><Icon nome="sacola" size={15} />Ver pedido ({quantidadeCarrinho})</a></div></div>
          <div className="catalog-search"><Icon nome="busca" /><input type="search" aria-label="Buscar produto no cardápio" placeholder="Buscar produto, nome ou SKU…" value={busca} onChange={e => onBusca(e.target.value)} /></div>
          <div className="catalog-categories" role="group" aria-label="Categorias do cardápio">
            <Segmento ativo={categoria === 'todas'} onClick={() => onCategoria('todas')}>Todas</Segmento>
            {categorias.map(cat => <Segmento key={cat.id} ativo={categoria === cat.nome} onClick={() => onCategoria(cat.nome)}>{cat.nome}</Segmento>)}
          </div>
        </div>
        <div className="catalog-results" tabIndex={0} aria-label="Produtos disponíveis">
          {grupos.length === 0 && <div className="composer-empty"><Icon nome="busca" size={32} /><h4>Nenhum produto encontrado</h4><p>Tente outro nome, SKU ou categoria.</p><button type="button" className="composer-text-button" onClick={() => { onBusca(''); onCategoria('todas') }}>Limpar filtros</button></div>}
          {grupos.map(grupo => <section className="catalog-group" key={grupo.id} aria-label={grupo.nome}>
            <h4>{grupo.nome}<span>{grupo.itens.length}</span></h4>
            <div className="catalog-products">{grupo.itens.map(({ produto, variacao }) => {
              const quantidade = itens.filter(item => item.variacao_id === variacao.id).reduce((soma, item) => soma + (Number(item.quantidade) || 0), 0)
              return <button type="button" key={variacao.id} className={`catalog-product ${quantidade ? 'is-added' : ''}`} aria-label={`Adicionar ${produto.nome_comercial || produto.nome}, ${variacao.nome_variacao}`} onClick={() => onAdicionar(variacao)}>
                <span className="product-glyph"><Icon nome={/bebida|cerveja|chopp/i.test(grupo.nome) ? 'bebida' : 'produto'} size={25} /></span>
                <span className="product-info"><strong>{produto.nome_comercial || produto.nome}</strong><span>{variacao.nome_variacao} <span className="product-sku">· {produto.sku}</span></span><b>{dinheiro(calcularPrecoCanal(variacao.preco_venda, markup))}</b></span>
                <span className="product-add">{quantidade > 0 && <span className="product-quantity">{quantidade}</span>}<Icon nome="mais" size={18} /></span>
              </button>
            })}</div>
          </section>)}
        </div>
        <div className="catalog-footnote"><Icon nome="ajuste" size={16} /><span>Adicione um produto e personalize os adicionais no carrinho.</span></div>
      </section>

      <aside id={`${id}-carrinho`} className="order-cart" aria-label="Resumo do pedido atual">
        <div className="cart-heading"><div><Icon nome="sacola" /><h3>Pedido atual</h3></div><span className="composer-count" role="status" aria-live="polite" aria-atomic="true">{quantidadeCarrinho} {quantidadeCarrinho === 1 ? 'item' : 'itens'}</span></div>
        <div className="cart-scroll">
          <div className="cart-section cart-identity">
            <div className="order-fields">
              <label htmlFor={`${id}-loja`}>Unidade<select id={`${id}-loja`} title={loja?.nome} value={lojaId} onChange={e => onLoja(e.target.value)}><option value="">Selecione a unidade</option>{lojas.map(l => <option key={l.id} value={l.id}>{l.nome.replace(/^.*?[-–—]\s*(Unidade\s+)/i, '$1')}</option>)}</select></label>
              <label htmlFor={`${id}-cpf`}>CPF do cliente<input id={`${id}-cpf`} ref={inputRef} disabled={cadastrando} value={cpf} onChange={e => onCpf(formatarCPF(e.target.value))} inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" maxLength={16} /></label>
            </div>
            <div aria-live="polite" className="customer-status">
              {status === 'ocioso' && <span>Informe o CPF para localizar ou cadastrar o cliente.</span>}
              {status === 'invalido' && <span className="composer-error">CPF inválido. Confira os números.</span>}
              {status === 'buscando' && <span>Buscando cliente…</span>}
              {status === 'encontrado' && <span className="composer-success"><Icon nome="check" size={15} />{encontrado?.nome}</span>}
            </div>
            {status === 'erro' && <p role="alert" className="composer-error">Não foi possível consultar. <button type="button" className="composer-text-button" onClick={onTentar}>Tentar novamente</button></p>}
            {status === 'nao_encontrado' && <details className="composer-disclosure customer-registration" open>
              <summary><span>Cliente não cadastrado</span><span className="disclosure-action">Cadastrar</span></summary>
              <div className="disclosure-body"><p>Complete o cadastro para usar neste pedido.</p><div className="order-fields">
                <label htmlFor={`${id}-nome`}>Nome completo<input id={`${id}-nome`} value={nome} onChange={e => onNome(e.target.value)} placeholder="Nome do cliente" /></label>
                <label htmlFor={`${id}-telefone`}>Telefone<input id={`${id}-telefone`} ref={telefoneRef} inputMode="tel" value={telefone} onChange={e => onTelefone(formatarTelefone(e.target.value))} placeholder="(11) 98765-4321" maxLength={16} /></label>
              </div><CamposEndereco valores={endereco} onChange={onEndereco} /><button type="button" className="composer-primary" onClick={onCadastrar} disabled={cadastrando}>{cadastrando ? 'Cadastrando…' : 'Cadastrar e usar cliente'}</button></div>
            </details>}
            <div className="composer-field-title">Canal de venda</div>
            <div className="order-segments channel-segments" role="group" aria-label="Canal de venda">{configCanais.map(c => <Segmento key={c.canal_venda} ativo={canalVenda === c.canal_venda} title={`${c.nome_exibicao}${Number(c.taxa_plataforma_percentual) > 0 ? ` · taxa ${c.taxa_plataforma_percentual}%` : ''}`} onClick={() => onCanal(c.canal_venda)}>{c.canal_venda === 'proprio' ? 'Canal próprio' : c.nome_exibicao}</Segmento>)}</div>
            {canalVenda !== 'proprio' && <p className="composer-hint">Preços ajustados para a comissão do canal ({configCanais.find(c => c.canal_venda === canalVenda)?.taxa_plataforma_percentual}%). O frete é tratado pela plataforma.</p>}
            {loja && <div className="order-segments service-segments" role="group" aria-label="Tipo de atendimento"><Segmento ativo={tipo === 'delivery'} onClick={() => onTipo('delivery')}><Icon nome="entrega" size={16} />Delivery</Segmento><Segmento ativo={tipo === 'presencial'} disabled={somenteDelivery} title={somenteDelivery ? 'Esta unidade atende somente delivery' : undefined} onClick={() => onTipo('presencial')}><Icon nome="local" size={16} />Presencial</Segmento></div>}
          </div>

          <div className="cart-section cart-items">
            <div className="composer-field-title">Itens do pedido</div>
            {itens.length === 0 && <div className="composer-empty cart-empty"><span className="empty-bag"><Icon nome="sacola" size={28} /></span><h4>Seu pedido começa aqui</h4><p>Toque em <strong>+</strong> no cardápio para adicionar produtos.</p></div>}
            {itens.map((item, idx) => <article className="cart-item" key={item.chave || idx}>
              <div className="cart-item-title"><strong>{item.nome}</strong><button type="button" className="cart-remove" aria-label={`Remover ${item.nome}`} onClick={() => onRemover(idx)}><Icon nome="fechar" size={16} /></button></div>
              {item.adicionaisSelecionados.length > 0 && <p className="cart-additional-names">{item.adicionaisSelecionados.map(a => a.nome).join(' · ')}</p>}
              <div className="cart-item-bottom"><div className="quantity-stepper"><button type="button" aria-label={`Diminuir quantidade de ${item.nome}`} disabled={Number(item.quantidade) <= 1} onClick={() => alterarQuantidade(idx, Math.max(1, Number(item.quantidade) - 1))}><Icon nome="menos" size={14} /></button><input type="number" min="1" max="9999" step="1" aria-label={`Quantidade de ${item.nome}`} value={item.quantidade} onChange={e => alterarQuantidade(idx, e.target.value)} /><button type="button" aria-label={`Aumentar quantidade de ${item.nome}`} disabled={Number(item.quantidade) >= 9999} onClick={() => alterarQuantidade(idx, (Number(item.quantidade) || 0) + 1)}><Icon nome="mais" size={14} /></button></div><strong>{dinheiro(valorItem(item))}</strong></div>
              {item.permiteAdicionais && <div className="cart-customize"><button type="button" aria-expanded={adicionalAberto === idx} className="composer-text-button" onClick={() => onAdicionalAberto(adicionalAberto === idx ? null : idx)}><Icon nome="ajuste" size={14} />{item.adicionaisSelecionados.length ? 'Editar adicionais' : 'Personalizar item'}</button>
                {adicionalAberto === idx && <div className="cart-additionals">{adicionaisDoProduto(item.produto_sku).map(a => <Segmento key={a.id} ativo={item.adicionaisSelecionados.some(s => s.id === a.id)} onClick={() => onAdicional(idx, a)}>{a.nome}<span>+ {dinheiro(a.preco_adicional)}</span></Segmento>)}{adicionaisDoProduto(item.produto_sku).length === 0 && <p>Nenhum adicional disponível para este produto.</p>}</div>}
              </div>}
            </article>)}
          </div>

          {freteObrigatorio && <div className="cart-section cart-delivery">
            <details className="composer-disclosure">
              <summary><span><Icon nome="entrega" size={18} />Entrega e endereço</span><span className={cotacaoAtiva ? 'composer-success' : 'disclosure-action'}>{cotacaoAtiva ? dinheiro(frete) : 'Calcular frete'}<span className="disclosure-chevron" /></span></summary>
              <div className="disclosure-body">
                {lojaId && encontrado ? <ConsultaEntrega key={`${lojaId}-${encontrado.cpf}`} lojaId={lojaId} modoPedido pontoSalvo={loja?.latitude != null && loja?.longitude != null} clienteCpf={encontrado.cpf}
                  destinoInicial={Object.fromEntries(['cep', 'numero', 'endereco', 'complemento', 'bairro', 'cidade', 'estado'].map(campo => [campo, String(encontrado[campo] ?? '').trim()]))}
                  onInvalidar={onInvalidar} onCotacao={onCotacao} /> : <p>Selecione a unidade e o cliente para calcular a rota.</p>}
              </div>
            </details>
            {cotacaoAtiva && <p className="composer-hint">Destino: {cotacao?.endereco?.endereco}, {cotacao?.endereco?.numero} · cotação válida por 15 min.</p>}
          </div>}

          <div className="cart-section cart-payment"><div className="composer-field-title"><Icon nome="cartao" size={16} />Pagamento</div><div className="payment-segments" role="group" aria-label="Forma de pagamento">{[{ valor: 'pix', label: 'Pix' }, { valor: 'credito', label: 'Crédito' }, { valor: 'debito', label: 'Débito' }, { valor: 'dinheiro', label: 'Dinheiro' }].map(opcao => <Segmento key={opcao.valor} ativo={forma === opcao.valor} onClick={() => onForma(opcao.valor)}>{opcao.label}</Segmento>)}</div>
            {forma === 'dinheiro' && <label className="cash-field" htmlFor={`${id}-troco`}>Valor recebido<input id={`${id}-troco`} type="number" min="0" step="0.01" value={troco} onChange={e => onTroco(e.target.value)} placeholder="Vazio = valor exato" /><span className={troco !== '' && Number(troco) < total ? 'composer-error' : 'composer-hint'}>{troco === '' ? 'Sem troco: será usado o total do pedido.' : Number(troco) >= total ? `Troco: ${dinheiro(Number(troco) - total)}` : 'Valor menor que o total.'}</span></label>}
            <details className="composer-disclosure order-notes"><summary>Observações do pedido<span className="disclosure-action">{observacoes ? 'Editar' : 'Adicionar'}</span></summary><label className="disclosure-body" htmlFor={`${id}-obs`}><span className="sr-only">Observações do pedido</span><textarea id={`${id}-obs`} value={observacoes} onChange={e => onObservacoes(e.target.value)} placeholder="Ex.: sem cebola, ponto da carne…" rows={2} /></label></details>
          </div>
        </div>

        <div className="cart-checkout"><dl><div><dt>Subtotal</dt><dd>{dinheiro(subtotal)}</dd></div><div><dt>Taxa de entrega</dt><dd>{freteObrigatorio ? cotacaoAtiva ? dinheiro(frete) : 'A calcular' : tipo === 'delivery' ? 'Pela plataforma' : 'Não se aplica'}</dd></div><div className="checkout-total"><dt>Total do pedido</dt><dd>{dinheiro(total)}</dd></div></dl>
          {freteObrigatorio && !cotacaoAtiva && <p className="checkout-pending">Total parcial · falta calcular o frete</p>}
          <button type="button" className="composer-primary checkout-submit" onClick={onConcluir} disabled={enviando || pendente || Boolean(pendencia)} aria-describedby={`${id}-pendencia`}><span>{enviando ? 'Enviando…' : 'Concluir pedido'}</span><Icon nome="seta" size={20} /></button>
          <p id={`${id}-pendencia`} className="checkout-hint">{pendente ? 'Confirme o envio anterior acima.' : pendencia || 'Tudo pronto. O pedido será enviado à cozinha.'}</p>
        </div>
      </aside>
    </fieldset>
  </section>
}
