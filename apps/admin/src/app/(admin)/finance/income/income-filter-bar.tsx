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
interface IncomeFilterBarProps {
  divisions: { id: string; name: string }[];
  clients: { id: string; name: string; businessName: string | null }[];
  currentDivisionId?: string;
  currentClientId?: string;
  baseUrl?: string;
}

export function IncomeFilterBar({
  divisions,
  clients,
  currentDivisionId,
  currentClientId,
  baseUrl = '/finance/income',
}: IncomeFilterBarProps) {
  const router = useRouter();

  function handleDivisionChange(value: string) {
    const params = new URLSearchParams();
    if (value !== 'all') params.set('divisionId', value);
    if (currentClientId) params.set('clientId', currentClientId);
    router.push(baseUrl + '?' + params.toString());
  }

  function handleClientChange(value: string) {
    const params = new URLSearchParams();
    if (currentDivisionId) params.set('divisionId', currentDivisionId);
    if (value !== 'all') params.set('clientId', value);
    router.push(baseUrl + '?' + params.toString());
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

      <div className="w-64">
        <SearchableClientSelect
          clients={clients}
          value={currentClientId ?? 'all'}
          onValueChange={(val) => handleClientChange(val || 'all')}
          emptyOption={{ value: 'all', label: 'All clients' }}
          placeholder="All clients"
        />
      </div>
    </div>
  );
}
