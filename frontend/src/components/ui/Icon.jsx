const paths = {
  painel: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  analytics: 'M4 20V10m8 10V4m8 16v-7M2 20h20',
  entrega: 'M3 5h11v12H3z M14 9h4l3 4v4h-7 M6 17a2 2 0 1 0 0 .01 M18 17a2 2 0 1 0 0 .01',
  pedido: 'M6 4h12v17l-3-2-3 2-3-2-3 2z M9 8h6m-6 4h6m-6 4h3 M9 4V2h6v2',
  historico: 'M3 11a9 9 0 1 1 2.6 7 M3 4v7h7 M12 7v5l3 2',
  clientes: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M17 4a4 4 0 0 1 0 8m2 3a4 4 0 0 1 3 4v2',
  produto: 'M4 10a8 7 0 0 1 16 0H4z M3 14h18M4 18h16l-1 3H5z M8 6h.01M12 5h.01M16 6h.01',
  estoque: 'm3 7 9-5 9 5v10l-9 5-9-5z m0 0 9 5 9-5 M12 12v10 M7.5 4.5l9 5',
  busca: 'M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15 M16 16l5 5',
  mais: 'M12 5v14M5 12h14',
  menos: 'M5 12h14',
  fechar: 'm6 6 12 12M6 18 18 6',
  sacola: 'M4 7h16l1 14H3z M8 8V6a4 4 0 0 1 8 0v2',
  seta: 'M4 12h16m-6-6 6 6-6 6',
  check: 'm5 12 4 4L19 6',
  cartao: 'M3 4h18v16H3z M3 9h18 M7 15h4',
  local: 'M12 22s8-7 8-13a8 8 0 1 0-16 0c0 6 8 13 8 13z M12 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
  ajuste: 'M4 7h16M4 17h16M8 4v6m8 4v6',
  alerta: 'm12 3 10 18H2z M12 9v5m0 3h.01',
  bebida: 'M5 7h14l-2 14H7z M8 7V3h8 M13 7l2-5',
  relogio: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v5l3 2',
}

export default function Icon({ nome, size = 20, className = '' }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={className}>
    <path d={paths[nome] || paths.pedido} />
  </svg>
}
