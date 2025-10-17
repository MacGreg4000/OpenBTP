import React, { forwardRef, useState } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import FormInput, { FormInputProps } from './FormInput';

export interface SearchInputProps extends FormInputProps {
  onSearch?: (value: string) => void;
}

const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, onSearch, placeholder, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [hasValue, setHasValue] = useState(false);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && onSearch) {
        e.preventDefault();
        onSearch((e.target as HTMLInputElement).value);
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(e.target.value.length > 0);
      if (props.onChange) {
        props.onChange(e);
      }
    };

    // Masquer l'icône lorsque le champ est en focus ou a une valeur
    const showIcon = !isFocused && !hasValue && (!props.value || props.value.toString().length === 0);

    return (
      <div className="relative w-full">
        {showIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
        )}
        <FormInput
          ref={ref}
          type="search"
          className={`${showIcon ? 'pl-12' : 'pl-4'} h-10 w-full ${className || ''}`}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={handleChange}
          placeholder={placeholder ?? ''}
          {...props}
        />
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';

export default SearchInput; 