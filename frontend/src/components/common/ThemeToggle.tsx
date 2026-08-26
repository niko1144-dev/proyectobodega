import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  variant?: 'pill' | 'icon';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  className = '', 
  variant = 'pill' 
}) => {
  const { isDark, toggleTheme } = useTheme();

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`p-2 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 ${
          isDark 
            ? 'bg-[#101C30] hover:bg-[#162744] text-amber-400 border border-[#1E3352] focus:ring-amber-400/40 shadow-xs' 
            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 focus:ring-[#003B70]/30 shadow-xs'
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

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`group flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 focus:outline-none focus:ring-2 ${
        isDark
          ? 'bg-[#0E1A2D] hover:bg-[#14233D] text-slate-200 border border-[#1E3352] focus:ring-amber-400/40 shadow-xs'
          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 focus:ring-[#003B70]/30 shadow-xs'
      } ${className}`}
      title={isDark ? 'Activar Modo Día (Aspecto Claro)' : 'Activar Modo Noche (Aspecto Oscuro Ejecutivo)'}
      aria-label="Alternar tema de color"
    >
      {isDark ? (
        <>
          <div className="w-4 h-4 rounded-full bg-amber-400/20 flex items-center justify-center text-amber-400 group-hover:rotate-45 transition-transform duration-300">
            <Sun className="w-3 h-3 text-amber-400" />
          </div>
          <span className="hidden sm:inline text-amber-300 font-semibold text-[11px]">Modo Noche</span>
        </>
      ) : (
        <>
          <div className="w-4 h-4 rounded-full bg-blue-50 flex items-center justify-center text-[#003B70] group-hover:-rotate-12 transition-transform duration-300">
            <Moon className="w-3 h-3 text-[#003B70]" />
          </div>
          <span className="hidden sm:inline text-[#003B70] font-semibold text-[11px]">Modo Día</span>
        </>
      )}
    </button>
  );
};
