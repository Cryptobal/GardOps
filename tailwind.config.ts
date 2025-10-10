import type { Config } from 'tailwindcss'

const config: Config = {
  // Dark mode usando clase (necesario para el tema)
  darkMode: 'class',
  
  // En Tailwind CSS 4, content es opcional gracias a autodetección
  // pero lo mantenemos para compatibilidad
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  
  // Plugins necesarios
  plugins: [
    require('tailwindcss-animate'),
  ],
}

export default config
