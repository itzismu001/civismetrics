/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Roboto Mono', 'Consolas', 'monospace'],
        display: ['Montserrat', 'Inter', 'sans-serif'],
      },
      colors: {
        /* ── Enterprise Engineering Dark Palette ── */
        canvas:     '#080c16', /* Outermost backdrop */
        dashboard:  '#0b1120', /* Main app frame */
        'dash-950': '#080d19', /* Deepest layer */
        'dash-900': '#0d1527', /* Sidebar & header */
        'dash-850': '#101a30', /* Content backdrop */
        'dash-800': '#15223c', /* Card base */
        'dash-700': '#1c2d4e', /* Elevated surfaces */
        cardDark:   '#111c33', /* Main cards */
        panelDark:  '#0d1629', /* Sub-panels */
        borderDark: '#1e293b', /* Standard borders */
        borderGlow: '#38bdf8', /* Accent border highlight */
        
        /* ── Light Mode (Clean Slate) ── */
        lightdash:  '#f8fafc',
        
        /* ── Brand Palette (Engineering Cyan / Royal Blue) ── */
        accentStart: '#0ea5e9',   /* Sky 500 */
        accentEnd:   '#3b82f6',   /* Blue 500 */
        
        brand: {
          50:  '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        
        /* ── Engineering Status Codes ── */
        success: '#10b981',
        warning: '#f59e0b',
        danger:  '#ef4444',
        info:    '#0ea5e9',
      },
      backgroundImage: {
        'gradient-brand':   'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)',
        'gradient-card':    'linear-gradient(145deg, #111c33 0%, #0d1629 100%)',
        'gradient-card-hover': 'linear-gradient(145deg, #15223e 0%, #0f1a32 100%)',
        'gradient-hero':    'linear-gradient(135deg, #0b1120 0%, #101c34 50%, #0d1527 100%)',
        'gradient-sidebar': 'linear-gradient(180deg, #080d19 0%, #0d1527 100%)',
      },
      boxShadow: {
        'premium-dark':  '0 25px 50px -12px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.05)',
        'glow-accent':   '0 0 20px -3px rgba(14,165,233,0.45)',
        'glow-blue':     '0 0 20px -3px rgba(59,130,246,0.45)',
        'glow-emerald':  '0 0 20px -3px rgba(16,185,129,0.35)',
        'glow-amber':    '0 0 20px -3px rgba(245,158,11,0.35)',
        'card-dark':     '0 4px 20px -4px rgba(0,0,0,0.5), 0 0 0 1px rgba(30,41,59,0.8)',
        'card-hover':    '0 12px 32px -6px rgba(0,0,0,0.7), 0 0 0 1px rgba(14,165,233,0.3)',
      },
      keyframes: {
        'fade-in-up': {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scan-line': {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(400%)' },
        },
      },
      animation: {
        'fade-in-up':  'fade-in-up 0.5s cubic-bezier(0.16,1,0.3,1) forwards',
        'fade-in':     'fade-in 0.4s ease forwards',
        'scan-line':   'scan-line 3s linear infinite',
      }
    }
  },
  plugins: [],
}