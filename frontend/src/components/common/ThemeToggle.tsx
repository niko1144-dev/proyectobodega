import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  variant?: 'segmented' | 'pill' | 'icon';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  className = '', 
  variant = 'segmented' 
}) => {
  const { theme, isDark, setTheme } = useTheme();

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        className={`p-2 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 ${
          isDark 
            ? 'bg-[#101C30] hover:bg-[#162744] text-amber-400 border border-[#1E3352] focus:ring-amber-400/40 shadow-xs' 
            : 'bg-white hover:bg-slate-100 text-[#003B70] border border-slate-200 focus:ring-[#003B70]/30 shadow-xs'
        } ${className}`}
        title={isDark ? 'Cambiar a Modo Día' : 'Cambiar a Modo Noche'}
        aria-label={isDark ? 'Cambiar a Modo Día' : 'Cambiar a Modo Noche'}
      >
        {isDark ? (
          <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-90 duration-300" />
        ) : (
          <Moon className="w-4 h-4 text-[#003B70] animate-in spin-in-90 duration-300" />
        )}
      </button>
    );
  }

  // Segmented Switch con dos botones claros [ ☀️ Día | 🌙 Noche ]
  return (
    <div 
      className={`inline-flex items-center p-1 rounded-full border transition-all duration-200 shadow-xs ${
        isDark 
          ? 'bg-[#0B1526] border-[#1E3352]' 
          : 'bg-slate-100 border-slate-200'
      } ${className}`}
      role="group"
      aria-label="Selector de Tema Día / Noche"
    >
      {/* Botón Modo Día */}
      <button
        type="button"
        onClick={() => setTheme('light')}
        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all duration-200 focus:outline-none ${
          !isDark
            ? 'bg-white text-[#003B70] shadow-sm border border-slate-200/80 scale-100'
            : 'text-slate-400 hover:text-slate-200 opacity-70 hover:opacity-100'
        }`}
        title="Activar Modo Día (Aspecto Claro Institucional)"
      >
        <Sun className={`w-3.5 h-3.5 ${!isDark ? 'text-amber-500 fill-amber-500/20' : 'text-slate-400'}`} />
        <span className="font-semibold">Día</span>
      </button>

      {/* Botón Modo Noche */}
      <button
        type="button"
        onClick={() => setTheme('dark')}
        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all duration-200 focus:outline-none ${
          isDark
            ? 'bg-[#003B70] text-white shadow-sm border border-[#38BDF8]/40 scale-100'
            : 'text-slate-500 hover:text-slate-800 opacity-70 hover:opacity-100'
        }`}
        title="Activar Modo Noche (Aspecto Oscuro Ejecutivo)"
      >
        <Moon className={`w-3.5 h-3.5 ${isDark ? 'text-[#38BDF8] fill-[#38BDF8]/20' : 'text-slate-400'}`} />
        <span className="font-semibold">Noche</span>
      </button>
    </div>
  );
};
