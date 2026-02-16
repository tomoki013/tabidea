'use client';

import { useState, useRef, useEffect, ChangeEvent, KeyboardEvent } from 'react';
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

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      handleBlur();
    }
  };

  if (isEditing) {
    if (multiline) {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={localValue}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            "bg-white/80 border-b-2 border-primary/50 rounded-none px-1 outline-none w-full ring-0 font-hand focus:border-primary",
            className
          )}
          rows={3}
        />
      );
    }
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        value={localValue}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        type={type}
        className={cn(
          "bg-white/80 border-b-2 border-primary/50 rounded-none px-1 outline-none w-full ring-0 font-hand focus:border-primary",
          className
        )}
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
