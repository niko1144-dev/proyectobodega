/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta Oficial ChileAtiende & Gobierno de Chile - Modo Ejecutivo Premium
        chileatiende: {
          blue: "#003B70",       // Azul Institucional Principal
          dark: "#002A50",       // Azul Oscuro (Hover / Headers)
          light: "#0E2442",      // Azul Profundo para Superficies
          border: "#1E3B66",
        },
        gob: {
          red: "#E4002B",        // Rojo Institucional Gobierno de Chile
          redDark: "#B80022",    // Rojo Hover
          redLight: "#380D15",   // Rojo Oscuro para Alertas
        },
        surface: {
          bg: "#0A111E",         // Background Global Ejecutivo
          card: "#101C30",       // Superficie de Tarjetas Slate Navy
          cardSecondary: "#0D1728", // Sub-tarjetas y filtros
          border: "#1E3352",     // Bordes y Divisores
        },
        status: {
          successBg: "rgba(6, 78, 59, 0.6)",
          successText: "#34D399",
          successBorder: "#059669",
          warningBg: "rgba(69, 26, 3, 0.6)",
          warningText: "#FBBF24",
          warningBorder: "#D97706",
          dangerBg: "rgba(76, 5, 25, 0.6)",
          dangerText: "#F87171",
          dangerBorder: "#E11D48",
          infoBg: "rgba(12, 43, 89, 0.6)",
          infoText: "#60A5FA",
          infoBorder: "#1D4ED8",
        }
      },
      fontFamily: {
        sans: ['"Open Sans"', 'Roboto', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'gov': '0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'gov-card': '0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 4px 6px -1px rgba(0, 0, 0, 0.08)',
        'gov-dropdown': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}
