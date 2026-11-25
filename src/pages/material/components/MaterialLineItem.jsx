import React, { useState, useRef, useEffect } from 'react';
import { X, Edit2, ChevronDown } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Searchable Dropdown Component
function SearchableDropdown({ value, onChange, options, placeholder, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option) => {
    onChange(option);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleInputClick = () => {
    if (!disabled) {
      setIsOpen(true);
      inputRef.current?.focus();
    }
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
  };

  const displayValue = isOpen ? searchTerm : (value || '');

  return (
    <div ref={dropdownRef} className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onClick={handleInputClick}
          placeholder={placeholder}
          disabled={disabled}
          className="h-auto w-full rounded-md border-line-input bg-surface px-3 py-2.5 pr-8 text-sm text-ink-1 placeholder:text-ink-4 focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-100"
          autoComplete="off"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          <ChevronDown size={16} className={`text-ink-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-surface border border-line-input rounded-md max-h-60 overflow-y-auto">
          {filteredOptions.length > 0 ? (
            <ul className="py-1">
              {filteredOptions.map((option, index) => (
                <li
                  key={index}
                  onClick={() => handleSelect(option)}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-primary-soft transition-colors ${
                    option === value ? 'bg-primary-soft text-primary font-medium' : 'text-ink-1'
                  }`}
                >
                  {option}
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-3 py-2 text-sm text-ink-3 text-center">
              No results found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MaterialLineItem({
  material,
  index,
  isEditing,
  categories,
  getSubcategories,
  getSubSubcategories,
  getSubSubSubcategories,
  onUpdate,
  onRemove,
  onEdit,
  onDoneEditing,
  loading = false
}) {
  return (
    <Accordion
      type="single"
      collapsible
      value={isEditing ? 'material' : ''}
      onValueChange={(value) => (value ? onEdit() : onDoneEditing())}
    >
      <AccordionItem value="material" className="overflow-hidden rounded-md border border-line-input bg-surface">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <AccordionTrigger className="p-3 text-left hover:no-underline">
              <div className="flex-1 animate-fade-in">
                <p className="text-xs text-ink-2 font-medium mb-2">Material #{index + 1}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-ink-3">Category:</span>
                    <p className="text-ink-1 font-medium truncate">{material.category}</p>
                  </div>
                  <div>
                    <span className="text-ink-3">Sub Category:</span>
                    <p className="text-ink-1 font-medium truncate">{material.subCategory}</p>
                  </div>
                  <div>
                    <span className="text-ink-3">Sub Category 1:</span>
                    <p className="text-ink-1 font-medium truncate">{material.subCategory1}</p>
                  </div>
                  <div>
                    <span className="text-ink-3">Sub Category 2:</span>
                    <p className="text-ink-1 font-medium truncate">{material.subCategory2}</p>
                  </div>
                  <div>
                    <span className="text-ink-3">Quantity:</span>
                    <p className="text-ink-1 font-medium">{material.quantity}</p>
                  </div>
                </div>
              </div>
            </AccordionTrigger>
          </div>
          <div className="flex flex-shrink-0 gap-1 pt-2">
            {!isEditing && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onEdit}
                className="h-auto w-auto rounded p-1.5 hover:bg-surface-muted"
              >
                <Edit2 size={16} className="text-ink-3" />
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onRemove}
              className="h-auto w-auto rounded p-1.5 hover:bg-surface-muted"
            >
              <X size={16} className="text-tone-bad-fg" />
            </Button>
          </div>
        </div>
        <AccordionContent className="border-t bg-surface-muted p-4">
          <div className="animate-slide-down">
            {/* Row 1: Category and Sub Category */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <Label className="mb-1.5 block text-xs font-normal leading-4 text-ink-2">Category</Label>
                <SearchableDropdown
                  value={material.category}
                  onChange={(value) => onUpdate('category', value)}
                  options={categories}
                  placeholder="Select or type category..."
                  disabled={loading}
                />
              </div>

              <div>
                <Label className="mb-1.5 block text-xs font-normal leading-4 text-ink-2">Sub Category</Label>
                <SearchableDropdown
                  value={material.subCategory}
                  onChange={(value) => onUpdate('subCategory', value)}
                  options={material.category ? getSubcategories(material.category) : []}
                  placeholder="Select or type subcategory..."
                  disabled={!material.category || loading}
                />
              </div>
            </div>

            {/* Row 2: Sub Category 1 and Sub Category 2 */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <Label className="mb-1.5 block text-xs font-normal leading-4 text-ink-2">Sub Category 1</Label>
                <SearchableDropdown
                  value={material.subCategory1}
                  onChange={(value) => onUpdate('subCategory1', value)}
                  options={material.subCategory ? getSubSubcategories(material.category, material.subCategory) : []}
                  placeholder="Select or type sub-category..."
                  disabled={!material.subCategory || loading}
                />
              </div>

              <div>
                <Label className="mb-1.5 block text-xs font-normal leading-4 text-ink-2">Sub Category 2</Label>
                <SearchableDropdown
                  value={material.subCategory2}
                  onChange={(value) => onUpdate('subCategory2', value)}
                  options={material.subCategory1 ? getSubSubSubcategories(material.category, material.subCategory, material.subCategory1) : []}
                  placeholder="Select or type sub-category..."
                  disabled={!material.subCategory1 || loading}
                />
              </div>
            </div>

            {/* Row 3: Quantity */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label
                  htmlFor={`material-${index}-quantity`}
                  className="mb-1.5 block text-xs font-normal leading-4 text-ink-2"
                >
                  Quantity
                </Label>
                <Input
                  id={`material-${index}-quantity`}
                  type="number"
                  placeholder="Enter qty"
                  value={material.quantity}
                  onChange={(e) => onUpdate('quantity', e.target.value)}
                  className="h-auto w-full rounded-md border-line-input bg-surface px-3 py-2.5 text-sm text-ink-1 placeholder:text-ink-4 focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                  min="1"
                />
              </div>
            </div>

            {/* Done Editing Button */}
            <div className="flex justify-center pt-3">
              <Button
                type="button"
                variant="ghost"
                onClick={onDoneEditing}
                className="h-auto gap-1 p-0 text-sm font-medium text-primary hover:bg-transparent hover:text-primary-strong"
              >
                <span>✓</span>
                <span>Done editing</span>
              </Button>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}