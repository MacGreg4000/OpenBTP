import React, { ButtonHTMLAttributes, forwardRef } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    variant = 'primary', 
    size = 'md', 
    isLoading = false, 
    fullWidth = false,
    leftIcon,
    rightIcon,
    className = '',
    children,
    disabled,
    ...props 
  }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors';
    
    const variantStyles = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 border border-transparent',
      secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-500 border border-transparent dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600',
      outline: 'bg-transparent text-gray-700 hover:bg-gray-50 focus:ring-gray-500 border border-gray-300 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 border border-transparent',
      success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 border border-transparent',
    };
    
    const sizeStyles = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };
    
    const widthStyles = fullWidth ? 'w-full' : '';
    
    const disabledStyles = (disabled || isLoading) 
      ? 'opacity-50 cursor-not-allowed' 
      : '';
    
    return (
      <button
        ref={ref}
        className={`
          ${baseStyles}
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${widthStyles}
          ${disabledStyles}
          ${className}
        `}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        
        {!isLoading && leftIcon && (
          <span className="mr-2">{leftIcon}</span>
        )}
        
        {children}
        
        {!isLoading && rightIcon && (
          <span className="ml-2">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button; 