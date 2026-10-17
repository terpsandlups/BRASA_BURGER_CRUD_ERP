import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { falhou: false }
  static getDerivedStateFromError() { return { falhou: true } }
  render() {
    if (!this.state.falhou) return this.props.children
    return <div role="alert" className="rounded-xl bg-branco border border-borda p-6 space-y-3">
      <h1 className="text-2xl">Não foi possível abrir esta página</h1>
      <p className="text-sm text-fumaca">Confira sua conexão e recarregue para recuperar a operação.</p>
      <button type="button" onClick={() => window.location.reload()} className="rounded-lg bg-ambar text-carvao px-4 py-3">Recarregar aplicativo</button>
    </div>
  }
}
