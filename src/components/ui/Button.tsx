import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-ui text-sm font-semibold transition-all select-none border border-carbon cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:translate-x-[1px] active:translate-y-[1px]';

  const sizeStyles = {
    sm: 'min-h-[38px] px-3 text-xs gap-1.5',
    md: 'min-h-[44px] px-4 text-sm gap-2',
    lg: 'min-h-[48px] px-6 text-base gap-2.5',
    icon: 'min-h-[44px] min-w-[44px] p-2',
  };

  const variantStyles = {
    primary: 'bg-carbon text-white hover:bg-carbon/90 shadow-brutalist-sm hover:shadow-none',
    secondary: 'bg-white text-carbon hover:bg-subtle shadow-brutalist-sm hover:shadow-none',
    ghost: 'bg-transparent text-carbon border-transparent hover:border-carbon hover:bg-subtle/70',
    accent: 'bg-accent text-white hover:bg-accent-hover shadow-brutalist-sm hover:shadow-none',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-brutalist-sm hover:shadow-none',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
