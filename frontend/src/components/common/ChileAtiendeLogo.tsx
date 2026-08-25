import React from 'react';
import logoPng from '../../assets/ips-chileatiende-logo.png';

interface ChileAtiendeLogoProps {
  className?: string;
  variant?: 'full' | 'icon-only' | 'horizontal';
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'panel';
}

export const ChileAtiendeLogo: React.FC<ChileAtiendeLogoProps> = ({
  className = '',
  size = 'md'
}) => {
  // Dimensiones ampliadas y generosas para alta visibilidad y nitidez en paneles
  const sizeClasses = {
    sm: 'h-9 sm:h-10 w-auto',
    md: 'h-11 sm:h-12 w-auto',
    lg: 'h-16 sm:h-18 w-auto',
    xl: 'h-24 sm:h-28 w-auto',
    '2xl': 'h-28 sm:h-32 w-auto',
    panel: 'h-24 sm:h-28 max-w-[340px] w-full'
  };

  return (
    <img
      src={logoPng || '/img/ips-chileatiende-logo.png'}
      alt="Logo Oficial IPS ChileAtiende - Instituto de Previsión Social"
      className={`object-contain select-none shrink-0 transition-all ${sizeClasses[size]} ${className}`}
      draggable={false}
    />
  );
};
