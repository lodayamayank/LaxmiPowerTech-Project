import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
        <Label className="block mb-1.5">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
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
            icon && "pl-8",
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