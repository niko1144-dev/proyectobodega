import React from 'react';
import { AssetPropertyType, AssetStatus, PhysicalCondition } from '../../types/asset';
import { AssignmentStatus } from '../../types/assignment';

interface BadgeProps {
  children?: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-semibold';
  
  const variantClasses = {
    primary: 'bg-[#003B70] text-white border border-[#003B70] dark:border-[#38BDF8]/40 shadow-xs',
    success: 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/60',
    warning: 'bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700/60',
    danger: 'bg-red-50 dark:bg-red-950/80 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-700/60',
    info: 'bg-blue-50 dark:bg-[#0C2447] text-blue-800 dark:text-[#60A5FA] border border-blue-200 dark:border-[#1E4B8A]',
    purple: 'bg-purple-50 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-700/60',
    neutral: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md ${sizeClasses} ${variantClasses[variant]}`}>
      {children}
    </span>
  );
};

export const PropertyBadge: React.FC<{ type: AssetPropertyType }> = ({ type }) => {
  if (type === 'PROPIO') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-md bg-[#003B70] dark:bg-gradient-to-r dark:from-[#003B70] dark:to-[#0055A5] text-white border border-transparent dark:border-[#38BDF8]/40 shadow-xs">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
        PROPIO CHILEATIENDE
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-md bg-blue-50 dark:bg-[#0C2447] text-blue-800 dark:text-[#60A5FA] border border-blue-200 dark:border-[#1E4B8A]">
      <span className="w-1.5 h-1.5 rounded-full bg-[#003B70] dark:bg-[#38BDF8]"></span>
      ARRIENDO PROVEEDOR
    </span>
  );
};

export const ConsumableBadge: React.FC = () => {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
      CONSUMIBLE / ACCESORIO
    </span>
  );
};

export const StatusBadge: React.FC<{ status: AssetStatus }> = ({ status }) => {
  switch (status) {
    case 'BODEGA_DISPONIBLE':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-md bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/60">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse"></span>
          Bodega Disponible
        </span>
      );
    case 'ASIGNADO':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-blue-50 dark:bg-[#0C2447] text-blue-800 dark:text-[#60A5FA] border border-blue-200 dark:border-[#1E4B8A]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#003B70] dark:bg-[#38BDF8]"></span>
          Asignado a Funcionario
        </span>
      );
    case 'EN_MANTENCION':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700/60">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400"></span>
          En Mantención
        </span>
      );
    case 'DADO_DE_BAJA':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-red-50 dark:bg-red-950/80 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-700/60">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 dark:bg-red-400"></span>
          Dado de Baja
        </span>
      );
    case 'DEVUELTO_PROVEEDOR':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500 dark:bg-slate-400"></span>
          Devuelto a Proveedor
        </span>
      );
    default:
      return <Badge>{status}</Badge>;
  }
};

export const ConditionBadge: React.FC<{ condition: PhysicalCondition }> = ({ condition }) => {
  switch (condition) {
    case 'NUEVO':
      return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/60">Nuevo</span>;
    case 'BUENO':
      return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-50 dark:bg-[#0C2447] text-blue-800 dark:text-[#60A5FA] border border-blue-200 dark:border-[#1E4B8A]">Bueno</span>;
    case 'REGULAR':
      return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700/60">Regular</span>;
    case 'DETERIORADO':
    case 'IRREPARABLE':
      return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-red-50 dark:bg-red-950/80 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-700/60">{condition}</span>;
    default:
      return <Badge>{condition}</Badge>;
  }
};

export const AssignmentStatusBadge: React.FC<{ status: AssignmentStatus }> = ({ status }) => {
  switch (status) {
    case 'FIRMADO_DIGITAL':
      return <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/60">✓ Firmado Digitalmente</span>;
    case 'FIRMADO_FISICO_SUBIDO':
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-blue-50 dark:bg-[#0C2447] text-blue-800 dark:text-[#60A5FA] border border-blue-200 dark:border-[#1E4B8A]">✓ Acta Física Escaneada</span>;
    case 'PENDIENTE_FIRMA':
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700/60">⏳ Pendiente de Firma</span>;
    case 'DEVUELTO_COMPLETO':
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">Devolución Completa</span>;
    case 'DEVUELTO_PARCIAL':
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-purple-50 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-700/60">Devuelto Parcial</span>;
    case 'ANULADO':
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-red-50 dark:bg-red-950/80 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-700/60">Anulado</span>;
    default:
      return <Badge>{status}</Badge>;
  }
};

