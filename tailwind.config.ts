import type { Config } from 'tailwindcss'

/** Semantic tokens resolve to CSS variables (see src/styles/main.css) so light/dark swap in one place. */
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Paleta oficial ParquiTime
        carvao: '#0F172A',
        parque: { DEFAULT: '#0EA5A0', 700: '#0B7F7B', 50: '#E6F6F5' },
        alegria: { DEFAULT: '#F59E0B', 700: '#A16207' },
        suave: '#E5E7EB',
        escuro: '#1F2937',
        alerta: { DEFAULT: '#DC4545', 700: '#B42F2F', 50: '#FCECEC' },
        // Tokens semânticos (variam por tema)
        page: v('page'),
        surface: v('surface'),
        ink: v('ink'),
        muted: v('muted'),
        line: v('line'),
        'run-bg': v('run-bg'),
        'run-ink': v('run-ink'),
        'pause-bg': v('pause-bg'),
        'done-bg': v('done-bg'),
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        lane: '14px',
        control: '12px',
      },
      fontSize: {
        // Escala modular (~1.25) inspirada em Bringhurst
        xs: ['0.8125rem', { lineHeight: '1.15rem' }],
        sm: ['0.875rem', { lineHeight: '1.3rem' }],
        base: ['1rem', { lineHeight: '1.55rem' }],
        lg: ['1.25rem', { lineHeight: '1.7rem' }],
        xl: ['1.5625rem', { lineHeight: '2rem' }],
        timer: ['2.5rem', { lineHeight: '1' }],
        'timer-xl': ['4.75rem', { lineHeight: '1' }],
      },
      minHeight: { touch: '3rem' },
      minWidth: { touch: '3rem' },
    },
  },
  plugins: [],
} satisfies Config
