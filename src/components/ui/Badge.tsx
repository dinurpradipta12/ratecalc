import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'neutral' | 'accent' | 'emerald' | 'amber' | 'crimson';
  className?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  className = '',
  size = 'md',
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-mono font-medium tracking-tight border border-carbon uppercase tabular-numbers';
  
  const sizeStyles = {
    sm: 'px-1.5 py-0.5 text-[10px] leading-tight',
    md: 'px-2 py-0.5 text-xs leading-normal',
  };

  const variantStyles = {
    neutral: 'bg-subtle text-carbon border-carbon',
    accent: 'bg-accent text-white border-carbon',
    emerald: 'bg-emerald-50 text-semantic-emerald border-semantic-emerald font-semibold',
    amber: 'bg-amber-50 text-semantic-amber border-semantic-amber font-semibold',
    crimson: 'bg-red-50 text-semantic-crimson border-semantic-crimson font-semibold',
  };

  return (
    <span className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
};
