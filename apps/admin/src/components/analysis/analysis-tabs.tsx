'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AnalysisTabsProps {
  defaultTab: string;
  children: React.ReactNode;
}

export function AnalysisTabs({ defaultTab, children }: AnalysisTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const currentTab = searchParams.get('tab') || defaultTab;

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    // Use push instead of replace if you want back-button to undo tab changes
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
      {children}
    </Tabs>
  );
}
