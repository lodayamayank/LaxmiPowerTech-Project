import React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const InputField = ({ 
  label, 
  name, 
  type = "text", 
  icon, 
  value, 
  onChange, 
  placeholder = "",
  className = "",
  error = "",
  required = false,
  disabled = false,
  ...props 
}) => {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium mb-1.5">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </div>
        )}
        <Input
          type={type}
          name={name}
          value={value || ""}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            icon && "pl-10",
            error && "border-destructive focus-visible:ring-destructive"
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-destructive">{error}</p>
      )}
    </div>
  );
};

export default InputField;