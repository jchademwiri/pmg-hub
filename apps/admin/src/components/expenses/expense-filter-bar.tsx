'use client';

import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fmtMonthYear } from '@/lib/format';

interface ExpenseFilterBarProps {
  divisions: { id: string; name: string }[];
  categories: string[];
  currentDivisionId?: string;
  currentCategory?: string;
}

export function ExpenseFilterBar({
  divisions,
  categories,
  currentDivisionId,
  currentCategory,
}: ExpenseFilterBarProps) {
  const router = useRouter();
  const basePath = '/finance/expenses';

  function handleDivisionChange(value: string) {
    const params = new URLSearchParams();
    if (value !== 'all') params.set('divisionId', value);
    if (currentCategory) params.set('category', currentCategory);
    router.push(`${basePath}?` + params.toString());
  }

  function handleCategoryChange(value: string) {
    const params = new URLSearchParams();
    if (currentDivisionId) params.set('divisionId', currentDivisionId);
    if (value !== 'all') params.set('category', value);
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
    </div>
  );
}
