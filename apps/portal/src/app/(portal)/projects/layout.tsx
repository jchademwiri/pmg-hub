import { redirect } from 'next/navigation';
import type * as React from 'react';

export default function PortalProjectsLayout({ children }: { children: React.ReactNode }) {
  // Feature temporarily hidden — redirect all /projects/* routes to /dashboard
  redirect('/dashboard');

  return <>{children}</>;
}
