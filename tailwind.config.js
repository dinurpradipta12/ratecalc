/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: '#F6F5F0',
        subtle: '#ECEAE2',
        card: '#FFFFFF',
        carbon: '#111110',
        mutedText: '#575652',
        accent: {
          DEFAULT: '#EA580C',
          hover: '#C2410C',
          light: '#FFEDD5',
        },
        semantic: {
          emerald: '#15803D',
          emeraldLight: '#DCFCE7',
          amber: '#B45309',
          amberLight: '#FEF3C7',
          crimson: '#B91C1C',
          crimsonLight: '#FEE2E2',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        ui: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      letterSpacing: {
        tighter: '-0.025em',
      },
      borderRadius: {
        sharp: '0px',
        subtle: '2px',
      },
      borderWidth: {
        DEFAULT: '1px',
        hairline: '1px',
      }
    },
  },
  plugins: [],
}
