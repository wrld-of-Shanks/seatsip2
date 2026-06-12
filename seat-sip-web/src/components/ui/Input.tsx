'use client';

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-stone-700 mb-1">
          {label}
        </label>
      )}
      <input
        className={`w-full px-3 py-2 border ${
          error ? 'border-red-300' : 'border-stone-300'
        } rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
          error ? 'focus:ring-red-500' : ''
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
