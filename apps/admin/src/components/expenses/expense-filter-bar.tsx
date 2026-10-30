'use client';

import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableClientSelect } from '@/components/billing/searchable-client-select';
import { fmtMonthYear } from '@/lib/format';

interface ExpenseFilterBarProps {
  divisions: { id: string; name: string }[];
  categories: string[];
  clients?: { id: string; name: string; businessName?: string | null }[];
  currentDivisionId?: string;
  currentCategory?: string;
  currentClientId?: string;
}

export function ExpenseFilterBar({
  divisions,
  categories,
  clients = [],
  currentDivisionId,
  currentCategory,
  currentClientId,
}: ExpenseFilterBarProps) {
  const router = useRouter();
  const basePath = '/finance/expenses';

  function handleDivisionChange(value: string) {
    const params = new URLSearchParams();
    if (value !== 'all') params.set('divisionId', value);
    if (currentCategory) params.set('category', currentCategory);
    if (currentClientId) params.set('clientId', currentClientId);
    router.push(`${basePath}?` + params.toString());
  }

  function handleCategoryChange(value: string) {
    const params = new URLSearchParams();
    if (currentDivisionId) params.set('divisionId', currentDivisionId);
    if (value !== 'all') params.set('category', value);
    if (currentClientId) params.set('clientId', currentClientId);
    router.push(`${basePath}?` + params.toString());
  }

  function handleClientChange(value: string) {
    const params = new URLSearchParams();
    if (currentDivisionId) params.set('divisionId', currentDivisionId);
    if (currentCategory) params.set('category', currentCategory);
    if (value !== 'all') params.set('clientId', value);
    router.push(`${basePath}?` + params.toString());
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Select value={currentDivisionId ?? 'all'} onValueChange={handleDivisionChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="All divisions" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All divisions</SelectItem>
          {divisions.map((division) => (
            <SelectItem key={division.id} value={division.id}>
              {division.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={currentCategory ?? 'all'} onValueChange={handleCategoryChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category} value={category}>
              {category}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {clients.length > 0 && (
        <div className="w-64">
          <SearchableClientSelect
            clients={[
              { id: 'unassigned', name: 'General (No Client)', businessName: 'General (No Client)' },
              ...clients,
            ]}
            value={currentClientId ?? 'all'}
            onValueChange={(val) => handleClientChange(val || 'all')}
            emptyOption={{ value: 'all', label: 'All clients' }}
            placeholder="All clients"
          />
        </div>
      )}
    </div>
  );
}
