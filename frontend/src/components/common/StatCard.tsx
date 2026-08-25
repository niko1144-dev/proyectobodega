import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'blue' | 'purple' | 'emerald' | 'amber' | 'rose' | 'slate';
  badgeText?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'blue',
  badgeText,
  onClick
}) => {
  const variantStyles = {
    blue: {
      border: 'border-slate-200 hover:border-[#003B70]/40',
      iconBg: 'bg-[#EBF3FA] text-[#003B70] border border-[#BFDBFE]',
      valueColor: 'text-[#003B70]'
    },
    purple: {
      border: 'border-slate-200 hover:border-purple-300',
      iconBg: 'bg-purple-50 text-purple-700 border border-purple-200',
      valueColor: 'text-purple-900'
    },
    emerald: {
      border: 'border-slate-200 hover:border-emerald-300',
      iconBg: 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]',
      valueColor: 'text-emerald-700'
    },
    amber: {
      border: 'border-amber-200 hover:border-amber-400 bg-amber-50/40',
      iconBg: 'bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]',
      valueColor: 'text-amber-800'
    },
    rose: {
      border: 'border-red-200 hover:border-[#E4002B]/40 bg-red-50/40',
      iconBg: 'bg-[#FEF2F2] text-[#E4002B] border border-[#FECACA]',
      valueColor: 'text-[#E4002B]'
    },
    slate: {
      border: 'border-slate-200 hover:border-slate-300',
      iconBg: 'bg-slate-100 text-slate-700 border border-slate-200',
      valueColor: 'text-slate-900'
    }
  };

  const style = variantStyles[variant];

  return (
    <div
      onClick={onClick}
      className={`group relative bg-white rounded-xl p-5 sm:p-6 border shadow-gov transition-all duration-200 ${style.border} ${
        onClick ? 'cursor-pointer hover:shadow-gov-card hover:-translate-y-0.5' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500">{title}</p>
          <h4 className={`mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight ${style.valueColor}`}>{value}</h4>
          {subtitle && <p className="mt-1.5 text-xs sm:text-sm text-slate-600 font-medium">{subtitle}</p>}
        </div>
        <div className={`p-3.5 rounded-xl ${style.iconBg} transition-transform duration-200 group-hover:scale-105 shrink-0`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>

      {badgeText && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs sm:text-sm font-medium text-slate-600">
          <span>{badgeText}</span>
        </div>
      )}
    </div>
  );
};
