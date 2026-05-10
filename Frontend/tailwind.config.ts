import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-manrope)', 'sans-serif'],
        serif: ['var(--font-newsreader)', 'serif'],
        mono: ['monospace'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        // Nordic Healthcare Colors
        nordic: {
          charcoal: '#1d2222',
          sage: '#516057',
          'sage-light': '#7fb399',
          tan: '#ad916a',
          'tan-dark': '#6b5a3f',
          'page-bg': '#ebe8e7',
          'card-bg': '#ffffff',
          'table-header': '#f5f2f1',
          'sidebar-bg': '#1d2222',
          'sidebar-active': '#3d4343',
          'border-default': '#e2e2e2',
          'border-subtle': '#f3f4f6',
          'border-sidebar': '#3d4343',
          'text-primary': '#000000',
          'text-secondary': '#505454',
          'text-muted': '#6b7280',
          'text-tertiary': '#9ca3af',
        },
        primary: {
          DEFAULT: '#516057',
          foreground: '#ffffff',
          50: '#E8F5E9',
          100: '#C8E6C9',
          200: '#A5D6A7',
          300: '#81C784',
          400: '#66BB6A',
          500: '#4CAF50',
          600: '#43A047',
          700: '#388E3C',
          800: '#2E7D32',
          900: '#1B5E20',
        },
        secondary: {
          DEFAULT: '#1d2222',
          foreground: '#ffffff',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: '#ad916a',
          foreground: '#ffffff',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Table-specific colors
        'surface-container-low': '#f4f5f5',
        'surface-container': '#e9ebec',
        outline: '#9ca3af',
        'outline-variant': '#d1d5db',
        'on-surface-variant': '#9ca3af',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
}
export default config
