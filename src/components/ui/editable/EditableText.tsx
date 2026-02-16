'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils/cn';

interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  isEditable: boolean;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
  type?: 'text' | 'time';
}

export function EditableText({
  value,
  onChange,
  isEditable,
  placeholder,
  className,
  multiline = false,
  type = 'text',
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  if (!isEditable) {
    return <span className={cn("whitespace-pre-wrap", className)}>{value || placeholder}</span>;
  }

  const handleBlur = () => {
    setIsEditing(false);
    if (localValue !== value) {
      onChange(localValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      handleBlur();
    }
  };

  if (isEditing) {
    const Component = multiline ? 'textarea' : 'input';
    return (
      <Component
        ref={inputRef as any}
        value={localValue}
        onChange={(e: any) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        type={type}
        className={cn(
          "bg-white border border-primary/50 rounded px-1 outline-none w-full shadow-sm ring-2 ring-primary/20 font-sans",
          className
        )}
        rows={multiline ? 3 : undefined}
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={cn(
        "cursor-pointer hover:bg-black/5 rounded px-1 -mx-1 transition-colors border border-transparent hover:border-black/10 min-w-[2rem] inline-block whitespace-pre-wrap",
        !value && "text-stone-400 italic",
        className
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          setIsEditing(true);
        }
      }}
    >
      {value || placeholder || "（未入力）"}
    </div>
  );
}
