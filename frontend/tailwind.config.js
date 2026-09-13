/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // ---- paleta de marca (refinada conforme Design System) ----
        carvao: '#211E1A',
        superficie: '#171512',       // "carvão profundo" — cards/modais escuros
        superficie2: '#2A241E',      // bordas em contexto escuro
        ambar: '#C98A3A',
        'ambar-claro': '#D9A35A',
        osso: '#F2E8D5',
        branco: '#FFFFFF',
        fumaca: '#766F66',           // texto secundário
        oliva: '#2E7D5B',            // sucesso
        atencao: '#B7791F',
        brasa: '#B43B32',            // erro
        borda: '#D8D0C4',
        texto: '#24211E',            // texto principal sobre osso/branco

        // ---- tokens semânticos (para componentes novos) ----
        'bg-app': '#F2E8D5',
        'bg-surface': '#FFFFFF',
        'bg-sidebar': '#211E1A',
        'text-primary': '#24211E',
        'text-muted': '#766F66',
        'brand-primary': '#C98A3A',
        'border-default': '#D8D0C4',
        'state-success': '#2E7D5B',
        'state-warning': '#B7791F',
        'state-danger': '#B43B32',
      },
      fontFamily: {
        display: ['"Oswald"', 'sans-serif'],
        body: ['"Work Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
