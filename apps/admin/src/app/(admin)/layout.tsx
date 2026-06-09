import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/navigation/app-sidebar';
import { TopNav } from '@/components/navigation/top-nav';
import { PageHeaderProvider } from '@/components/navigation/page-header-context';
import { Toaster } from '@/components/ui/sonner';
import { ConfirmProvider } from '@/components/ui/confirm-dialog';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  const user = {
    name: session.user.name,
    email: session.user.email,
    role: (session.user as { role?: string }).role ?? 'viewer',
  };

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <PageHeaderProvider>
          <TopNav />
          <main className="flex-1 p-6 bg-background">
            <div className="mx-auto w-full max-w-7xl">
              <ConfirmProvider>{children}</ConfirmProvider>
            </div>
          </main>
        </PageHeaderProvider>
      </SidebarInset>
      <Toaster theme="dark" position="bottom-right" />
    </SidebarProvider>
  );
}
