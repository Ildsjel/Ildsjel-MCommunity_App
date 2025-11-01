import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Grimr Dark Theme - Occult/Church-like aesthetic
        'grim-black': '#0A0A0A',
        'deep-charcoal': '#1C1C1E',
        'iron-gray': '#333333',
        'stone-gray': '#888888',
        'silver-text': '#EAEAEA',
        'ghost-white': '#F9F9F9',
        'occult-crimson': '#8D021F',
        'whisper-green': '#2E6B3A',
        'shadow-gold': '#B8860B',
        'blood-red': '#9A031E',
        'rust-orange': '#C76F0E',
        'forest-green': '#3A7A45',
        'muted-blue': '#346B8C',
      },
      fontFamily: {
        serif: ['IM Fell DW Pica', 'Georgia', 'serif'],
        sans: ['Roboto', 'Inter', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config

