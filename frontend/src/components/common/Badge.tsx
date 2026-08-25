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
    primary: 'bg-[#003B70] text-white border border-[#002A50]',
    success: 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]',
    warning: 'bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]',
    danger: 'bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]',
    info: 'bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]',
    purple: 'bg-[#FAF5FF] text-[#6B21A8] border border-[#E9D5FF]',
    neutral: 'bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]'
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
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-md bg-[#003B70] text-white shadow-xs">
        <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
        PROPIO CHILEATIENDE
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-md bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]">
      <span className="w-1.5 h-1.5 rounded-full bg-[#1E40AF]"></span>
      ARRIENDO PROVEEDOR
    </span>
  );
};

export const ConsumableBadge: React.FC = () => {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]">
      CONSUMIBLE / ACCESORIO
    </span>
  );
};

export const StatusBadge: React.FC<{ status: AssetStatus }> = ({ status }) => {
  switch (status) {
    case 'BODEGA_DISPONIBLE':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-md bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
          Bodega Disponible
        </span>
      );
    case 'ASIGNADO':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]"></span>
          Asignado a Funcionario
        </span>
      );
    case 'EN_MANTENCION':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]"></span>
          En Mantención
        </span>
      );
    case 'DADO_DE_BAJA':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]"></span>
          Dado de Baja
        </span>
      );
    case 'DEVUELTO_PROVEEDOR':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#64748B]"></span>
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
      return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">Nuevo</span>;
    case 'BUENO':
      return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]">Bueno</span>;
    case 'REGULAR':
      return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]">Regular</span>;
    case 'DETERIORADO':
    case 'IRREPARABLE':
      return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]">{condition}</span>;
    default:
      return <Badge>{condition}</Badge>;
  }
};

export const AssignmentStatusBadge: React.FC<{ status: AssignmentStatus }> = ({ status }) => {
  switch (status) {
    case 'FIRMADO_DIGITAL':
      return <span className="px-2.5 py-1 text-xs font-bold rounded-md bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">✓ Firmado Digitalmente</span>;
    case 'FIRMADO_FISICO_SUBIDO':
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]">✓ Acta Física Escaneada</span>;
    case 'PENDIENTE_FIRMA':
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]">⏳ Pendiente de Firma</span>;
    case 'DEVUELTO_COMPLETO':
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]">Devolución Completa</span>;
    case 'DEVUELTO_PARCIAL':
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-[#FAF5FF] text-[#6B21A8] border border-[#E9D5FF]">Devuelto Parcial</span>;
    case 'ANULADO':
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]">Anulado</span>;
    default:
      return <Badge>{status}</Badge>;
  }
};
