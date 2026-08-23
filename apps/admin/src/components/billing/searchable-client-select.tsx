'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Search, X, Building2, User } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface ClientOption {
  id: string;
  name: string;
  businessName: string | null;
  email?: string | null;
  isActive?: boolean;
}

interface SearchableClientSelectProps {
  clients: ClientOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
}

export function SearchableClientSelect({
  clients,
  value,
  onValueChange,
  placeholder = 'Select a client…',
  disabled = false,
  className,
  id,
  name,
}: SearchableClientSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [highlightedIndex, setHighlightedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const selectedClient = React.useMemo(() => {
    return clients.find((c) => c.id === value);
  }, [clients, value]);

  // Sort and filter clients
  const filteredClients = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const list = clients.filter((c) => {
      if (!q) return true;
      const bName = (c.businessName || '').toLowerCase();
      const cName = (c.name || '').toLowerCase();
      const email = (c.email || '').toLowerCase();
      return bName.includes(q) || cName.includes(q) || email.includes(q);
    });

    return list.sort((a, b) => {
      const nameA = (a.businessName?.trim() || a.name).toLowerCase();
      const nameB = (b.businessName?.trim() || b.name).toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [clients, searchQuery]);

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

  function handleSelect(clientId: string) {
    onValueChange(clientId);
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
      setHighlightedIndex((prev) => (prev < filteredClients.length - 1 ? prev + 1 : prev));
      scrollHighlightedIntoView(highlightedIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      scrollHighlightedIntoView(highlightedIndex - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredClients[highlightedIndex]) {
        handleSelect(filteredClients[highlightedIndex].id);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleOpenChange(false);
    }
  }

  function scrollHighlightedIntoView(index: number) {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll('[data-client-option]');
    const target = items[index] as HTMLElement | undefined;
    if (target) {
      target.scrollIntoView({ block: 'nearest' });
    }
  }

  return (
    <div className="relative w-full">
      {name && <input type="hidden" name={name} value={value} />}
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            onKeyDown={handleKeyDown}
            className={cn(
              'w-full justify-between font-normal text-left h-9 px-3 border-input bg-transparent shadow-xs transition-colors hover:bg-muted/20 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none',
              !selectedClient && 'text-muted-foreground',
              className,
            )}
          >
            <span className="truncate flex items-center gap-2 flex-1 mr-1">
              {selectedClient ? (
                <>
                  <Building2 className="size-4 shrink-0 text-muted-foreground/70" />
                  <span className="font-medium text-foreground truncate">
                    {selectedClient.businessName?.trim() || selectedClient.name}
                  </span>
                  {selectedClient.businessName?.trim() &&
                    selectedClient.businessName.trim() !== selectedClient.name && (
                      <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                        ({selectedClient.name})
                      </span>
                    )}
                  {selectedClient.isActive === false && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1 py-0 h-4 border-amber-500/30 text-amber-600 bg-amber-500/10"
                    >
                      Inactive
                    </Badge>
                  )}
                </>
              ) : (
                placeholder
              )}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {selectedClient && !disabled && (
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
          className="w-[var(--radix-popover-trigger-width)] min-w-[320px] max-w-[480px] p-0 shadow-lg border bg-popover"
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
                placeholder="Search by company, contact, or email…"
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

            {/* Client List */}
            <div
              ref={listRef}
              className="max-h-64 overflow-y-auto p-1 divide-y divide-border/20"
              role="listbox"
            >
              {filteredClients.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {searchQuery ? (
                    <p>No clients found matching &ldquo;{searchQuery}&rdquo;</p>
                  ) : (
                    <p>No clients available</p>
                  )}
                </div>
              ) : (
                filteredClients.map((client, index) => {
                  const isSelected = client.id === value;
                  const isHighlighted = index === highlightedIndex;
                  const primaryTitle = client.businessName?.trim() || client.name;
                  const hasSeparateContact =
                    client.businessName?.trim() && client.businessName.trim() !== client.name;

                  return (
                    <div
                      key={client.id}
                      data-client-option
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(client.id)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={cn(
                        'flex items-center justify-between p-2.5 rounded-md text-sm cursor-pointer transition-colors select-none',
                        isHighlighted && 'bg-accent text-accent-foreground',
                        isSelected && 'bg-accent/70 font-medium',
                      )}
                    >
                      <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Building2 className="size-3.5 shrink-0 text-muted-foreground/70" />
                          <span className="font-semibold text-foreground truncate">
                            {primaryTitle}
                          </span>
                          {client.isActive === false && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1 py-0 h-4 border-amber-500/30 text-amber-600 bg-amber-500/10"
                            >
                              Inactive
                            </Badge>
                          )}
                        </div>
                        {(hasSeparateContact || client.email) && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground truncate pl-5">
                            {hasSeparateContact && (
                              <span className="flex items-center gap-1 truncate">
                                <User className="size-3 shrink-0" />
                                {client.name}
                              </span>
                            )}
                            {hasSeparateContact && client.email && <span>•</span>}
                            {client.email && <span className="truncate">{client.email}</span>}
                          </div>
                        )}
                      </div>
                      {isSelected && <Check className="size-4 shrink-0 text-primary ml-2" />}
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
