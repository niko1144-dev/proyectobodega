import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';
import { normalizeText } from '../../utils/formatters';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  disabled?: boolean;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  allowClear?: boolean;
  emptyMessage?: string;
  icon?: React.ReactNode;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Seleccione una opción...',
  searchPlaceholder = 'Escriba para filtrar...',
  className = '',
  disabled = false,
  required = false,
  allowClear = false,
  emptyMessage = 'No se encontraron resultados',
  icon
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputSearchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Selected Option Object
  const selectedOption = options.find(opt => opt.value === value);

  // Filtered Options based on Search Query (Insensible a tildes y mayúsculas)
  const filteredOptions = options.filter(opt => {
    if (!searchQuery.trim()) return true;
    const words = normalizeText(searchQuery).split(/\s+/).filter(Boolean);
    const target = normalizeText(
      `${opt.label} ${opt.sublabel || ''} ${opt.badge || ''} ${opt.value}`
    );
    return words.every(w => target.includes(w));
  });

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(0);
      setTimeout(() => {
        inputSearchRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightedIndex] && !filteredOptions[highlightedIndex].disabled) {
          handleSelect(filteredOptions[highlightedIndex].value);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
  };

  return (
    <div 
      ref={containerRef} 
      className={`relative w-full text-sm select-none ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${isOpen ? 'z-[100]' : 'z-10'} ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Botón / Input Display */}
      <div
        onClick={() => {
          if (!disabled) setIsOpen(!isOpen);
        }}
        tabIndex={disabled ? -1 : 0}
        className={`w-full min-h-[40px] px-3.5 py-2 bg-[#0C1729] border rounded-lg flex items-center justify-between gap-2.5 cursor-pointer transition-all ${
          isOpen 
            ? 'border-[#38BDF8] ring-2 ring-[#38BDF8]/20 shadow-sm' 
            : 'border-[#1E3352] hover:border-[#38BDF8]/60'
        } ${disabled ? 'cursor-not-allowed bg-[#08101E] opacity-50' : ''}`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {icon && <span className="text-[#38BDF8] shrink-0">{icon}</span>}
          
          {selectedOption ? (
            <div className="flex items-center gap-2 truncate">
              <span className="font-semibold text-slate-100 text-sm truncate">{selectedOption.label}</span>
              {selectedOption.badge && (
                <span className="text-xs px-2 py-0.5 rounded bg-[#0C2447] text-[#60A5FA] font-bold border border-[#1E4B8A] shrink-0">
                  {selectedOption.badge}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-500 font-normal text-sm truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
          {allowClear && selectedOption && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:text-[#EF4444] rounded transition-colors"
              title="Limpiar selección"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform duration-150 ${isOpen ? 'rotate-180 text-[#38BDF8]' : ''}`} />
        </div>
      </div>

      {/* Dropdown Flotante con Buscador */}
      {isOpen && (
        <div className="absolute z-[9999] left-0 right-0 mt-1.5 bg-[#101C30] border border-[#1E3352] rounded-xl shadow-2xl shadow-black/95 overflow-hidden animate-in fade-in duration-100 min-w-[240px]">
          {/* Campo de Búsqueda Integrado */}
          <div className="p-2.5 border-b border-[#1E3352] bg-[#0C1729]">
            <div className="relative flex items-center">
              <Search className="absolute left-3 w-4 h-4 text-slate-500 pointer-events-none" />
              <input
                ref={inputSearchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-8 py-2 bg-[#101C30] border border-[#1E3352] rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 text-slate-400 hover:text-white p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Lista de Opciones Filtradas */}
          <ul 
            ref={listRef}
            className="max-h-64 overflow-y-auto py-1 divide-y divide-[#182B48] text-sm"
            role="listbox"
          >
            {filteredOptions.length === 0 ? (
              <li className="px-4 py-4 text-center text-slate-500 text-sm italic">
                {emptyMessage}
              </li>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = option.value === value;
                const isHighlighted = index === highlightedIndex;

                return (
                  <li
                    key={option.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      if (!option.disabled) handleSelect(option.value);
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`px-3.5 py-2.5 flex items-center justify-between gap-2.5 cursor-pointer transition-colors ${
                      option.disabled 
                        ? 'opacity-40 cursor-not-allowed bg-[#0C1729]' 
                        : isSelected 
                          ? 'bg-[#003B70] text-white font-bold' 
                          : isHighlighted 
                            ? 'bg-[#162744] text-white' 
                            : 'text-slate-200 hover:bg-[#162744]'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate">{option.label}</span>
                        {option.badge && (
                          <span className={`text-xs px-2 py-0.5 rounded font-semibold shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-[#0C2447] text-[#60A5FA] border border-[#1E4B8A]'}`}>
                            {option.badge}
                          </span>
                        )}
                      </div>
                      {option.sublabel && (
                        <span className={`text-xs font-normal truncate mt-0.5 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                          {option.sublabel}
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-white shrink-0" />
                    )}
                  </li>
                );
              })
            )}
          </ul>

          {/* Footer Informativo con Total */}
          <div className="px-3.5 py-1.5 bg-[#0C1729] border-t border-[#1E3352] text-xs text-slate-400 flex items-center justify-between">
            <span>{filteredOptions.length} opción(es)</span>
            <span className="text-[11px] text-slate-500">↑↓ Navegar • Enter Seleccionar</span>
          </div>
        </div>
      )}

      {/* Input oculto para formularios HTML nativos si required */}
      {required && (
        <input
          type="text"
          name={placeholder}
          value={value}
          required={required}
          onChange={() => {}}
          className="sr-only"
          tabIndex={-1}
        />
      )}
    </div>
  );
};
