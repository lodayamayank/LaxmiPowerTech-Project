import React from 'react';
import { FaChevronDown } from 'react-icons/fa';

const Select = ({ 
  value, 
  onChange, 
  options = [], 
  placeholder = "Select option",
  className = "",
  disabled = false,
  icon = null
}) => {
  return (
    <div className="relative">
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          {icon}
        </div>
      )}
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`
          w-full appearance-none
          ${icon ? 'pl-10 pr-10' : 'px-3 pr-10'}
          py-2.5
          border border-gray-300 rounded-lg
          bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-100 text-sm
          dark:border-gray-600
          focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent
          hover:border-gray-400
          disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed disabled:text-gray-500
          transition-all cursor-pointer
          ${className}
        `}
      >
        {placeholder && (
          <option value="" disabled           className="text-gray-400 dark:text-gray-500">
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option 
            key={opt.value} 
            value={opt.value}
            className="text-gray-700 dark:bg-gray-800 dark:text-gray-100"
          >
            {opt.label}
          </option>
        ))}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-500">
        <FaChevronDown size={12} />
      </div>
    </div>
  );
};

export default Select;