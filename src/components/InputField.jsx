import React from 'react';

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
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        <input
          type={type}
          name={name}
          value={value || ""}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full border rounded-lg py-2.5
            ${icon ? "pl-10 pr-3" : "px-3"}
            ${error ? "border-red-500" : "border-gray-300"}
            ${disabled ? "bg-gray-100 cursor-not-allowed" : "bg-white"}
            text-gray-700 text-sm
            focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
            hover:border-gray-400
            transition-all
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};

export default InputField;