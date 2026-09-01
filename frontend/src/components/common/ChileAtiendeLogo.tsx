import React from 'react';
import logoLight from '../../assets/ips-chileatiende-logo-light.png';
import logoDark from '../../assets/ips-chileatiende-logo-dark.png';

interface ChileAtiendeLogoProps {
  className?: string;
  variant?: 'full' | 'icon-only' | 'horizontal';
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'panel';
}

export const ChileAtiendeLogo: React.FC<ChileAtiendeLogoProps> = ({
  className = '',
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'h-8 sm:h-9 w-auto',
    md: 'h-10 sm:h-12 w-auto',
    lg: 'h-16 sm:h-18 w-auto',
    xl: 'h-22 sm:h-26 w-auto',
    '2xl': 'h-26 sm:h-30 w-auto',
    panel: 'h-24 sm:h-28 max-w-[350px] w-full'
  };

  return (
    <div className={`relative inline-flex items-center justify-center select-none shrink-0 ${sizeClasses[size]} ${className}`}>
      {/* Logo Modo Día (Light) */}
      <img
        src={logoLight || '/img/ips-chileatiende-logo-light.png'}
        alt="Logo Oficial IPS ChileAtiende - Modo Día"
        className="w-full h-full object-contain dark:hidden transition-all duration-200"
        draggable={false}
      />

      {/* Logo Modo Noche (Dark) */}
      <img
        src={logoDark || '/img/ips-chileatiende-logo-dark.png'}
        alt="Logo Oficial IPS ChileAtiende - Modo Noche"
        className="w-full h-full object-contain hidden dark:block transition-all duration-200"
        draggable={false}
      />
    </div>
  );
};
