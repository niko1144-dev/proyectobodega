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
      border: 'border-slate-200 dark:border-[#1E3352] hover:border-[#003B70]/40 dark:hover:border-[#38BDF8]/50',
      iconBg: 'bg-[#EBF3FA] dark:bg-[#102444] text-[#003B70] dark:text-[#38BDF8] border border-[#BFDBFE] dark:border-[#1E3D6B]',
      valueColor: 'text-[#003B70] dark:text-white'
    },
    purple: {
      border: 'border-slate-200 dark:border-[#1E3352] hover:border-purple-300 dark:hover:border-purple-500/50',
      iconBg: 'bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700/60',
      valueColor: 'text-purple-900 dark:text-purple-200'
    },
    emerald: {
      border: 'border-slate-200 dark:border-[#1E3352] hover:border-emerald-300 dark:hover:border-emerald-500/50',
      iconBg: 'bg-[#ECFDF5] dark:bg-emerald-950/80 text-[#065F46] dark:text-emerald-300 border border-[#A7F3D0] dark:border-emerald-700/60',
      valueColor: 'text-emerald-700 dark:text-emerald-300'
    },
    amber: {
      border: 'border-amber-200 dark:border-amber-700/60 hover:border-amber-400 bg-amber-50/40 dark:bg-amber-950/20',
      iconBg: 'bg-[#FFFBEB] dark:bg-amber-950/80 text-[#92400E] dark:text-amber-300 border border-[#FDE68A] dark:border-amber-700/60',
      valueColor: 'text-amber-800 dark:text-amber-300'
    },
    rose: {
      border: 'border-red-200 dark:border-red-700/60 hover:border-[#E4002B]/40 bg-red-50/40 dark:bg-red-950/20',
      iconBg: 'bg-[#FEF2F2] dark:bg-red-950/80 text-[#E4002B] dark:text-red-300 border border-[#FECACA] dark:border-red-700/60',
      valueColor: 'text-[#E4002B] dark:text-red-300'
    },
    slate: {
      border: 'border-slate-200 dark:border-[#1E3352] hover:border-slate-300 dark:hover:border-slate-600',
      iconBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700',
      valueColor: 'text-slate-900 dark:text-white'
    }
  };

  const style = variantStyles[variant];

  return (
    <div
      onClick={onClick}
      className={`group relative bg-white dark:bg-[#101C30] rounded-xl p-5 sm:p-6 border shadow-gov dark:shadow-black/30 transition-all duration-200 ${style.border} ${
        onClick ? 'cursor-pointer hover:shadow-gov-card hover:-translate-y-0.5' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</p>
          <h4 className={`mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight ${style.valueColor}`}>{value}</h4>
          {subtitle && <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium">{subtitle}</p>}
        </div>
        <div className={`p-3.5 rounded-xl ${style.iconBg} transition-transform duration-200 group-hover:scale-105 shrink-0`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>

      {badgeText && (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#1E3352]/60 flex items-center text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300">
          <span>{badgeText}</span>
        </div>
      )}
    </div>
  );
};
