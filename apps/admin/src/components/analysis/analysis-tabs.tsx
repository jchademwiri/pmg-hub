'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Tabs } from '@/components/ui/tabs';

interface AnalysisTabsProps {
  defaultTab: string;
  children: React.ReactNode;
}

export function AnalysisTabs({ defaultTab, children }: AnalysisTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  let currentTab = searchParams.get('tab') || defaultTab;
  if (currentTab === 'comparison') {
    currentTab = 'mom';
  } else if (currentTab === 'pipeline') {
    currentTab = 'divisions';
  } else if (currentTab === 'ai-growth' || currentTab === 'details') {
    currentTab = defaultTab;
  }

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
      {children}
    </Tabs>
  );
}
