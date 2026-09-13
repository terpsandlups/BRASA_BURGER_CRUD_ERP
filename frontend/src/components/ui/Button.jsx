const VARIANTES = {
  primary: 'bg-ambar text-carvao hover:bg-ambar-claro disabled:opacity-40 disabled:cursor-not-allowed',
  secondary: 'bg-transparent text-texto border border-borda hover:bg-osso disabled:opacity-40',
  ghost: 'bg-transparent text-fumaca hover:text-texto disabled:opacity-40',
  danger: 'bg-transparent text-brasa border border-brasa/40 hover:bg-brasa/10 disabled:opacity-40',
}

export default function Button({ variant = 'primary', className = '', children, ...props }) {
  return (
    <button
      className={`px-4 py-2.5 text-sm font-medium transition-colors ${VARIANTES[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
