import React, { SelectHTMLAttributes } from 'react';

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}

/**
 * Composant de champ déroulant standardisé avec indication visuelle
 */
export default function SelectField({ label, required, children, className, ...props }: SelectFieldProps) {
  return (
    <div>
      <label 
        htmlFor={props.id} 
        className="block text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 mb-1.5"
      >
        {label}
        {required && <span className="text-red-600 dark:text-red-400 ml-1">*</span>}
      </label>
      <div className="relative">
        <select
          className={`w-full px-3 py-2.5 text-sm md:text-base border-2 border-gray-300 dark:border-gray-500 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 appearance-none disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:text-gray-700 dark:disabled:text-gray-200 disabled:border-gray-300 dark:disabled:border-gray-500 transition-colors ${className || ''}`}
          required={required}
          {...props}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
          <svg className="fill-current h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
          </svg>
        </div>
      </div>
    </div>
  );
} 