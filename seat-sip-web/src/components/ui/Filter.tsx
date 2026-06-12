'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Calendar, Filter as FilterIcon, X } from 'lucide-react';

export interface FilterConfig {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'dateRange';
  options?: { value: string; label: string }[];
}

interface FilterProps {
  configs: FilterConfig[];
  onFilterChange?: (filters: Record<string, any>) => void;
  showReset?: boolean;
}

export function Filter({ configs, onFilterChange, showReset = true }: FilterProps) {
  const router = useRouter();
  const searchParams = router.query;
  const [filters, setFilters] = useState<Record<string, any>>(() => {
    const initialFilters: Record<string, any> = {};
    configs.forEach((config) => {
      const rawValue = searchParams[config.key];
      if (rawValue) {
        const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
        if (config.type === 'dateRange') {
          const [start, end] = value.split(',');
          initialFilters[config.key] = { start, end };
        } else {
          initialFilters[config.key] = value;
        }
      }
    });
    return initialFilters;
  });

  useEffect(() => {
    if (onFilterChange) {
      onFilterChange(filters);
    }
  }, [filters, onFilterChange]);

  const updateFilter = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    updateURL(newFilters);
  };

  const updateURL = (newFilters: Record<string, any>) => {
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) {
        if (typeof value === 'object' && value.start && value.end) {
          params.set(key, `${value.start},${value.end}`);
        } else {
          params.set(key, value);
        }
      }
    });
    router.push(`?${params.toString()}`, undefined, { scroll: false });
  };

  const resetFilters = () => {
    setFilters({});
    router.push(window.location.pathname, undefined, { scroll: false });
  };

  const hasActiveFilters = Object.values(filters).some((value) => value);

  return (
    <div className="bg-white border border-stone-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <FilterIcon size={18} className="text-stone-600" />
          <h3 className="font-semibold text-stone-800">Filters</h3>
        </div>
        {showReset && hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="text-sm text-amber-600 hover:text-amber-800 flex items-center space-x-1"
          >
            <X size={14} />
            <span>Reset</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {configs.map((config) => (
          <div key={config.key}>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              {config.label}
            </label>
            {config.type === 'text' && (
              <input
                type="text"
                value={filters[config.key] || ''}
                onChange={(e) => updateFilter(config.key, e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                placeholder={`Search ${config.label.toLowerCase()}`}
              />
            )}
            {config.type === 'select' && (
              <select
                value={filters[config.key] || ''}
                onChange={(e) => updateFilter(config.key, e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="">All</option>
                {config.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            )}
            {config.type === 'date' && (
              <input
                type="date"
                value={filters[config.key] || ''}
                onChange={(e) => updateFilter(config.key, e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            )}
            {config.type === 'dateRange' && (
              <div className="flex space-x-2">
                <div className="flex-1">
                  <input
                    type="date"
                    value={filters[config.key]?.start || ''}
                    onChange={(e) =>
                      updateFilter(config.key, {
                        ...filters[config.key],
                        start: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="date"
                    value={filters[config.key]?.end || ''}
                    onChange={(e) =>
                      updateFilter(config.key, {
                        ...filters[config.key],
                        end: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
