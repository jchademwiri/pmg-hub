import type { ReactNode } from 'react';

import { SettingsNav } from '@/components/settings/settings-nav';

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[180px_minmax(0,1fr)]">
      <aside className="xl:pt-1">
        <SettingsNav />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
