/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta Oficial ChileAtiende & Gobierno de Chile
        chileatiende: {
          blue: "#003B70",       // Azul Institucional Principal
          dark: "#002A50",       // Azul Oscuro (Hover / Headers)
          light: "#EBF3FA",      // Azul Muy Claro (Fondos / Selección / Badges)
          border: "#BFDBFE",
        },
        gob: {
          red: "#E4002B",        // Rojo Institucional Gobierno de Chile
          redDark: "#B80022",    // Rojo Hover
          redLight: "#FEE2E2",   // Rojo Claro para Alertas
        },
        surface: {
          bg: "#F4F6F8",         // Background Global Institucional
          card: "#FFFFFF",       // Superficie de Tarjetas
          border: "#E2E8F0",     // Bordes y Divisores
        },
        status: {
          successBg: "#ECFDF5",
          successText: "#065F46",
          successBorder: "#A7F3D0",
          warningBg: "#FFFBEB",
          warningText: "#92400E",
          warningBorder: "#FDE68A",
          dangerBg: "#FEF2F2",
          dangerText: "#991B1B",
          dangerBorder: "#FECACA",
          infoBg: "#EFF6FF",
          infoText: "#1E40AF",
          infoBorder: "#BFDBFE",
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
