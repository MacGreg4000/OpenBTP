import React, { InputHTMLAttributes, forwardRef } from 'react';

export interface FormCheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  helperText?: string;
}

const FormCheckbox = forwardRef<HTMLInputElement, FormCheckboxProps>(
  ({ label, error, helperText, className, ...props }, ref) => {
    return (
      <div className="mb-4">
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              ref={ref}
              type="checkbox"
              className={`
                h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500
                ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
                ${className || ''}
              `}
              {...props}
            />
          </div>
          
          {label && (
            <div className="ml-3 text-sm">
              <label 
                htmlFor={props.id} 
                className="font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
              >
                {label}
                {props.required && <span className="text-red-500 ml-1">*</span>}
              </label>
            </div>
          )}
        </div>
        
        {error && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
        )}
      </div>
    );
  }
);

FormCheckbox.displayName = 'FormCheckbox';

export default FormCheckbox; 