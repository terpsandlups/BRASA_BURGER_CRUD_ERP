import { Fragment, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { formatarCPF, apenasDigitos, validarCPF, formatarTelefone } from '../lib/format.js'
import CamposEndereco from '../components/CamposEndereco.jsx'
import PageHeader from '../components/layout/PageHeader.jsx'
import Button from '../components/ui/Button.jsx'

const vazio = {
  cpf: '', nome: '', telefone: '', email: '',
  cep: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
}

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [form, setForm] = useState(vazio)
  const cpfInputRef = useRef(null)
  const telefoneInputRef = useRef(null)

  useEffect(() => {
    if (cpfInputRef.current && document.activeElement === cpfInputRef.current) {
      const pos = form.cpf.length
      cpfInputRef.current.setSelectionRange(pos, pos)
    }
  }, [form.cpf])

  useEffect(() => {
    if (telefoneInputRef.current && document.activeElement === telefoneInputRef.current) {
      const pos = form.telefone.length
      telefoneInputRef.current.setSelectionRange(pos, pos)
    }
  }, [form.telefone])
  const [busca, setBusca] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [expandidoCpf, setExpandidoCpf] = useState(null)
  const [perfis, setPerfis] = useState({}) // cpf -> estatísticas calculadas
  const [carregandoPerfil, setCarregandoPerfil] = useState(false)

  async function carregar() {
    const { data } = await supabase
      .from('clientes')
      .select('*')
      .order('data_cadastro', { ascending: false })
    if (data) setClientes(data)
  }

  useEffect(() => { carregar() }, [])

  async function abrirPerfil(cpf) {
    if (expandidoCpf === cpf) {
      setExpandidoCpf(null)
      return
    }
    setExpandidoCpf(cpf)
    if (perfis[cpf]) return // já calculado

    setCarregandoPerfil(true)
    const { data: pedidos } = await supabase
      .from('pedidos')
      .select('id, valor_total, criado_em, status, tipo_atendimento, lojas(nome), itens_pedido(quantidade, produtos(nome))')
      .eq('cliente_cpf', cpf)
      .order('criado_em', { ascending: true })
    setCarregandoPerfil(false)

    const validos = (pedidos || []).filter((p) => p.status !== 'cancelado')
    const faturamentoTotal = validos.reduce((acc, p) => acc + Number(p.valor_total), 0)
    const ticketMedio = validos.length > 0 ? faturamentoTotal / validos.length : 0

    const contagem = (lista) => {
      const mapa = new Map()
      for (const v of lista) mapa.set(v, (mapa.get(v) || 0) + 1)
      return [...mapa.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
    }

    const produtoContagem = new Map()
    for (const p of validos) {
      for (const item of p.itens_pedido || []) {
        const nome = item.produtos?.nome
        if (!nome) continue
        produtoContagem.set(nome, (produtoContagem.get(nome) || 0) + item.quantidade)
      }
    }
    const produtosFavoritos = [...produtoContagem.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)

    setPerfis({
      ...perfis,
      [cpf]: {
        totalPedidos: validos.length,
        totalCancelados: (pedidos || []).length - validos.length,
        faturamentoTotal,
        ticketMedio,
        primeiroPedido: validos[0]?.criado_em,
        ultimoPedido: validos[validos.length - 1]?.criado_em,
        unidadePreferida: contagem(validos.map((p) => p.lojas?.nome).filter(Boolean)),
        canalPreferido: contagem(validos.map((p) => p.tipo_atendimento)),
        produtosFavoritos,
      },
    })
  }

  async function salvar(e) {
    e.preventDefault()
    const cpfLimpo = apenasDigitos(form.cpf)
    if (!validarCPF(cpfLimpo)) {
      alert('CPF inválido — confira os números digitados.')
      return
    }
    if (!form.telefone || apenasDigitos(form.telefone).length < 10) {
      alert('Telefone inválido — informe DDD + número.')
      return
    }
    setSalvando(true)
    const { error } = await supabase.from('clientes').insert({
      ...form, cpf: cpfLimpo, telefone: apenasDigitos(form.telefone),
    })
    setSalvando(false)
    if (error) {
      alert('Erro ao cadastrar: ' + error.message)
      return
    }
    setForm(vazio)
    carregar()
  }

  const clientesFiltrados = clientes.filter((c) =>
    (c.nome + c.cpf).toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div>
      <PageHeader titulo="Clientes" descricao="Cadastro robusto com busca de CEP, validação de CPF e perfil CRM." />

      <form onSubmit={salvar} className="bg-superficie text-osso p-6 mb-8 grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="text-xs uppercase tracking-wide text-fumaca">CPF (identificador)</label>
          <input
            required
            ref={cpfInputRef}
            value={form.cpf}
            onChange={(e) => setForm({ ...form, cpf: formatarCPF(e.target.value) })}
            placeholder="000.000.000-00"
            maxLength={16}
            className="w-full mt-1 px-3 py-2 bg-carvao border border-superficie2 text-osso focus:outline-none focus:border-ambar"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-fumaca">Nome</label>
          <input
            required
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            className="w-full mt-1 px-3 py-2 bg-carvao border border-superficie2 text-osso focus:outline-none focus:border-ambar"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-fumaca">Telefone</label>
          <input
            required
            ref={telefoneInputRef}
            value={form.telefone}
            onChange={(e) => setForm({ ...form, telefone: formatarTelefone(e.target.value) })}
            placeholder="(11) 98765-4321"
            maxLength={16}
            className="w-full mt-1 px-3 py-2 bg-carvao border border-superficie2 text-osso focus:outline-none focus:border-ambar"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-fumaca">E-mail</label>
          <input
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full mt-1 px-3 py-2 bg-carvao border border-superficie2 text-osso focus:outline-none focus:border-ambar"
          />
        </div>
        <div className="col-span-2">
          <CamposEndereco
            valores={form}
            onChange={(campo, valor) => setForm((atual) => ({ ...atual, [campo]: valor }))}
          />
        </div>
        <div className="col-span-2">
          <Button variant="primary" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Cadastrar cliente'}
          </Button>
        </div>
      </form>

      <input
        placeholder="Buscar por nome ou CPF..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="w-full mb-4 px-3 py-2 border border-superficie2/40 focus:outline-none focus:border-ambar"
      />

      <table className="w-full text-sm bg-white">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-fumaca">
            <th className="py-2">CPF</th>
            <th className="py-2">Nome</th>
            <th className="py-2">Telefone</th>
            <th className="py-2">Cadastro</th>
          </tr>
        </thead>
        <tbody>
          {clientesFiltrados.map((c) => (
            <Fragment key={c.cpf}>
              <tr onClick={() => abrirPerfil(c.cpf)} className="cursor-pointer hover:bg-osso/60">
                <td className="py-2">{formatarCPF(c.cpf)}</td>
                <td className="py-2">{c.nome}</td>
                <td className="py-2">{formatarTelefone(c.telefone)}</td>
                <td className="py-2">{new Date(c.data_cadastro).toLocaleDateString('pt-BR')}</td>
              </tr>
              {expandidoCpf === c.cpf && (
                <tr className="bg-osso/40">
                  <td colSpan={4} className="p-4">
                    {carregandoPerfil && !perfis[c.cpf] ? (
                      <p className="text-sm text-fumaca">Calculando perfil...</p>
                    ) : perfis[c.cpf] ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-[11px] uppercase text-fumaca">Total de pedidos</p>
                          <p className="font-display text-xl">{perfis[c.cpf].totalPedidos}</p>
                          {perfis[c.cpf].totalCancelados > 0 && (
                            <p className="text-[11px] text-brasa">{perfis[c.cpf].totalCancelados} cancelado(s)</p>
                          )}
                        </div>
                        <div>
                          <p className="text-[11px] uppercase text-fumaca">Faturamento total</p>
                          <p className="font-display text-xl">R$ {perfis[c.cpf].faturamentoTotal.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase text-fumaca">Ticket médio</p>
                          <p className="font-display text-xl">R$ {perfis[c.cpf].ticketMedio.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase text-fumaca">Unidade / canal preferido</p>
                          <p className="text-sm mt-1">{perfis[c.cpf].unidadePreferida || '—'}</p>
                          <p className="text-xs text-fumaca capitalize">{perfis[c.cpf].canalPreferido || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase text-fumaca">Primeiro pedido</p>
                          <p className="text-sm mt-1">
                            {perfis[c.cpf].primeiroPedido ? new Date(perfis[c.cpf].primeiroPedido).toLocaleDateString('pt-BR') : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase text-fumaca">Último pedido</p>
                          <p className="text-sm mt-1">
                            {perfis[c.cpf].ultimoPedido ? new Date(perfis[c.cpf].ultimoPedido).toLocaleDateString('pt-BR') : '—'}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-[11px] uppercase text-fumaca">Produtos favoritos</p>
                          {perfis[c.cpf].produtosFavoritos.length > 0 ? (
                            <ul className="text-sm mt-1">
                              {perfis[c.cpf].produtosFavoritos.map(([nome, qtd]) => (
                                <li key={nome}>{nome} <span className="text-fumaca">({qtd}x)</span></li>
                              ))}
                            </ul>
                          ) : <p className="text-sm text-fumaca mt-1">Sem pedidos ainda</p>}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-fumaca">Sem pedidos registrados ainda.</p>
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
