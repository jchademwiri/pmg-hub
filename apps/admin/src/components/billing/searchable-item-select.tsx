'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Search, X, Package } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { formatZAR } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ActiveItem } from './billing-line-items-form';

interface SearchableItemSelectProps {
  activeItems: ActiveItem[];
  value: string;
  onValueChange: (itemId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function SearchableItemSelect({
  activeItems,
  value,
  onValueChange,
  placeholder = 'Optional catalogue item…',
  disabled = false,
  className,
}: SearchableItemSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [highlightedIndex, setHighlightedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const selectedItem = React.useMemo(() => {
    return activeItems.find((item) => item.id === value);
  }, [activeItems, value]);

  // Sort and filter catalogue items
  const filteredItems = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const list = activeItems.filter((item) => {
      if (!q) return true;
      const nameMatch = (item.name || '').toLowerCase().includes(q);
      const descMatch = (item.description || '').toLowerCase().includes(q);
      return nameMatch || descMatch;
    });

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [activeItems, searchQuery]);

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen);
    if (newOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
      setHighlightedIndex(0);
    }
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchQuery(e.target.value);
    setHighlightedIndex(0);
  }

  function handleSelect(itemId: string) {
    onValueChange(itemId);
    setOpen(false);
    setSearchQuery('');
    setHighlightedIndex(0);
  }

  function handleClear(e: React.MouseEvent | React.KeyboardEvent) {
    e.stopPropagation();
    onValueChange('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleOpenChange(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : prev));
      scrollHighlightedIntoView(highlightedIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      scrollHighlightedIntoView(highlightedIndex - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[highlightedIndex]) {
        handleSelect(filteredItems[highlightedIndex].id);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleOpenChange(false);
    }
  }

  function scrollHighlightedIntoView(index: number) {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll('[data-item-option]');
    const target = items[index] as HTMLElement | undefined;
    if (target) {
      target.scrollIntoView({ block: 'nearest' });
    }
  }

  return (
    <div className="relative w-full">
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            onKeyDown={handleKeyDown}
            className={cn(
              'w-full justify-between font-normal text-left h-9 px-3 border-input bg-transparent shadow-xs transition-colors hover:bg-muted/20 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none',
              !selectedItem && 'text-muted-foreground',
              className,
            )}
          >
            <span className="truncate flex items-center gap-2 flex-1 mr-1">
              {selectedItem ? (
                <>
                  <Package className="size-3.5 shrink-0 text-muted-foreground/70" />
                  <span className="font-medium text-foreground truncate">{selectedItem.name}</span>
                  {selectedItem.unitLabel && (
                    <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                      / {selectedItem.unitLabel}
                    </span>
                  )}
                </>
              ) : (
                placeholder
              )}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {selectedItem && !disabled && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={handleClear}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleClear(e);
                    }
                  }}
                  className="rounded-full p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  aria-label="Clear selection"
                >
                  <X className="size-3.5" />
                </span>
              )}
              <ChevronsUpDown className="size-4 opacity-50 shrink-0" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] min-w-[320px] max-w-[440px] p-0 shadow-lg border bg-popover"
          align="start"
        >
          <div className="flex flex-col">
            {/* Search Input */}
            <div className="flex items-center border-b px-3 py-2 gap-2 bg-muted/10">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDown}
                placeholder="Search products or services…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setHighlightedIndex(0);
                  }}
                  className="p-1 text-muted-foreground hover:text-foreground rounded-sm"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Item List */}
            <div
              ref={listRef}
              className="max-h-64 overflow-y-auto p-1 divide-y divide-border/20"
              role="listbox"
            >
              {/* Option to clear item selection */}
              {value && (
                <div
                  role="option"
                  aria-selected={false}
                  onClick={() => {
                    onValueChange('');
                    handleOpenChange(false);
                  }}
                  className="flex items-center gap-2 p-2 rounded-md text-xs text-muted-foreground hover:bg-muted/40 cursor-pointer mb-1"
                >
                  <X className="size-3.5" />
                  <span>Clear catalogue selection (custom line item)</span>
                </div>
              )}

              {filteredItems.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {searchQuery ? (
                    <p>No products found matching &ldquo;{searchQuery}&rdquo;</p>
                  ) : (
                    <p>No products available</p>
                  )}
                </div>
              ) : (
                filteredItems.map((item, index) => {
                  const isSelected = item.id === value;
                  const isHighlighted = index === highlightedIndex;
                  const priceNum = parseFloat(item.unitPrice) || 0;

                  return (
                    <div
                      key={item.id}
                      data-item-option
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(item.id)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={cn(
                        'flex items-center justify-between p-2.5 rounded-md text-sm cursor-pointer transition-colors select-none',
                        isHighlighted && 'bg-accent text-accent-foreground',
                        isSelected && 'bg-accent/70 font-medium',
                      )}
                    >
                      <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Package className="size-3.5 shrink-0 text-muted-foreground/70" />
                          <span className="font-semibold text-foreground truncate">
                            {item.name}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted-foreground truncate pl-5 line-clamp-1">
                            {item.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <div className="text-xs font-semibold tabular-nums text-foreground">
                            {formatZAR(priceNum)}
                          </div>
                          {item.unitLabel && (
                            <div className="text-[10px] text-muted-foreground">
                              / {item.unitLabel}
                            </div>
                          )}
                        </div>
                        {isSelected && <Check className="size-4 shrink-0 text-primary" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
