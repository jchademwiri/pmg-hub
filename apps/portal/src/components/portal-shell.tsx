'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  FileSpreadsheet,
  Receipt,
  PiggyBank,
  User,
  Menu,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ShieldCheck,
  ShieldAlert,
  X,
  CalendarDays,
  Shield,
} from 'lucide-react';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';

interface PortalShellProps {
  client: any;
  isImpersonating: boolean;
  children: React.ReactNode;
}


export function PortalShell({ client, isImpersonating, children }: PortalShellProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const pathname = usePathname();

  const handleStopImpersonating = React.useCallback(async () => {
    // Revoke the session server-side first — if this fails we stop here because
    // the client-side cookie clears below cannot remove HttpOnly cookies and
    // would leave the portal session active.
    try {
      await authClient.signOut();
    } catch (err) {
      console.error('Failed to revoke session:', err);
      alert('Could not end the impersonation session. Please try again.');
      return;
    }

    // signOut succeeded — clear the impersonation and session cookies.
    document.cookie = 'impersonate_client_id=; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'dev_impersonate_client_id=; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'better-auth.session_token=; path=/; max-age=0; SameSite=Lax';
    document.cookie = '__Secure-better-auth.session_token=; path=/; max-age=0; SameSite=Lax';

    // Attempt to close the tab directly
    try {
      window.close();
    } catch (e) {
      console.warn('Failed to close window:', e);
    }

    // Fallback: if the tab stays open, redirect to login page
    setTimeout(() => {
      window.location.href = '/login';
    }, 100);
  }, []);

  const handleSignOut = React.useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Clear impersonation cookies
    document.cookie = 'impersonate_client_id=; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'dev_impersonate_client_id=; path=/; max-age=0; SameSite=Lax';
    
    // Call better-auth signOut
    try {
      await authClient.signOut();
    } catch (err) {
      console.error('Failed to sign out:', err);
    }
    
    // Clear session cookies to be absolutely sure
    document.cookie = 'better-auth.session_token=; path=/; max-age=0; SameSite=Lax';
    document.cookie = '__Secure-better-auth.session_token=; path=/; max-age=0; SameSite=Lax';
    
    window.location.href = '/login';
  }, []);

  const NAV_ITEMS = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Projects', href: '/projects', icon: CalendarDays },
    { label: 'Invoices', href: '/invoices', icon: FileText },
    { label: 'Quotes', href: '/quotes', icon: FileSpreadsheet },
    { label: 'Statements', href: '/statements', icon: Receipt },
    { label: 'Compliance', href: '/compliance', icon: Shield },
    { label: 'Credit Notes', href: '/credits', icon: PiggyBank },
    { label: 'My Profile', href: '/profile', icon: User },
  ];

  return (
    <div className="flex min-h-screen bg-[#080c14] text-foreground font-sans selection:bg-blue-500/30">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex md:flex-col shrink-0 border-r border-white/5 bg-[#0a0f1d] sticky top-0 h-screen transition-all duration-300 print:hidden ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center gap-2 px-4 border-b border-white/5 overflow-hidden">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-md">
            <ShieldCheck className="size-4.5 text-white" />
          </div>
          {!isCollapsed && (
            <span className="font-bold text-white text-sm tracking-tight truncate animate-in fade-in duration-200">
              PMG Client Portal
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-6">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-2.5 py-2 text-sm font-medium rounded-lg transition-all group relative cursor-pointer ${
                  isActive
                    ? 'bg-blue-500/10 text-blue-400 font-semibold'
                    : 'text-muted-foreground hover:text-white hover:bg-white/[0.03]'
                }`}
              >
                <Icon className={`size-4 shrink-0 transition-colors ${isActive ? 'text-blue-400' : 'text-muted-foreground/75'}`} />
                {!isCollapsed ? (
                  <span className="truncate animate-in fade-in duration-200">{item.label}</span>
                ) : (
                  <span className="absolute left-14 z-50 rounded-md bg-[#0a0f1d] border border-white/10 px-2.5 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/5 bg-[#080c14]/30">
          {!isCollapsed && (
            <div className="mb-4 px-2 animate-in fade-in duration-200">
              <p className="text-xs font-semibold text-white truncate">{client.businessName || client.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{client.email}</p>
            </div>
          )}
          
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleSignOut}
              className={`flex w-full items-center gap-3 px-2.5 py-2 text-sm font-medium text-red-400 rounded-lg hover:text-red-300 hover:bg-red-500/5 transition-all group relative cursor-pointer border-0 bg-transparent text-left ${
                isCollapsed ? 'justify-center' : ''
              }`}
            >
              <LogOut className="size-4 shrink-0" />
              {!isCollapsed ? (
                <span>Sign Out</span>
              ) : (
                <span className="absolute left-14 z-50 rounded-md bg-[#0a0f1d] border border-white/10 px-2.5 py-1 text-xs text-red-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
                  Sign Out
                </span>
              )}
            </button>

            {/* Collapse Toggle Button */}
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:flex h-8 items-center justify-center rounded-lg border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] text-muted-foreground hover:text-white transition-all cursor-pointer"
            >
              {isCollapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Sidebar */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setIsMobileOpen(false)}
          />

          {/* Drawer content */}
          <aside className="relative flex w-full max-w-xs flex-1 flex-col bg-[#0a0f1d] border-r border-white/5 animate-in slide-in-from-left duration-200">
            <div className="flex h-16 items-center justify-between px-6 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-md">
                  <ShieldCheck className="size-4.5 text-white" />
                </div>
                <span className="font-bold text-white text-sm tracking-tight">PMG Client Portal</span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className="text-muted-foreground hover:text-white cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-1 px-4 py-6">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === '/dashboard'
                    ? pathname === '/dashboard'
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-500/10 text-blue-400 font-semibold'
                        : 'text-muted-foreground hover:text-white hover:bg-white/[0.03]'
                    }`}
                  >
                    <Icon className={`size-4 shrink-0 transition-colors ${isActive ? 'text-blue-400' : 'text-muted-foreground/75'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-white/5 bg-[#080c14]/30">
              <div className="mb-4 px-3">
                <p className="text-xs font-semibold text-white truncate">{client.businessName || client.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{client.email}</p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-red-400 rounded-lg hover:text-red-300 hover:bg-red-500/5 transition-all cursor-pointer border-0 bg-transparent text-left"
              >
                <LogOut className="size-4 shrink-0" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/5 bg-[#0a0f1d] px-6 sticky top-0 z-30 print:hidden">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-semibold text-white md:text-base truncate">
              {client.businessName || client.name}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Active Account
            </span>
          </div>
        </header>

        {/* Impersonation Banner - shown when an admin is viewing as a client */}
        {isImpersonating && (
          <div className="flex items-center gap-3 border-b border-amber-500/20 bg-amber-500/5 px-6 py-2.5 print:hidden">
            <ShieldAlert className="size-4 shrink-0 text-amber-400" />
            <span className="text-xs font-medium text-amber-300/90">
              Preview — Viewing as <strong className="text-amber-200">{client.businessName || client.name}</strong>
            </span>
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden sm:inline text-[10px] text-amber-400/50 font-mono">
                {client.id}
              </span>
              <button
                type="button"
                onClick={handleStopImpersonating}
                className="flex items-center gap-1.5 rounded-md border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-300 transition-all hover:bg-amber-500/20 hover:text-amber-200 cursor-pointer"
              >
                <X className="size-3" />
                Exit Preview
              </button>
            </div>
          </div>
        )}

        {/* Content Body */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-white/5 bg-[#0a0f1d]/95 backdrop-blur-md"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}
      >
        <div className="grid grid-cols-4 h-16 px-2 w-full overflow-hidden">
          <Link href="/dashboard" className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${pathname === '/dashboard' ? 'text-blue-400' : 'text-muted-foreground hover:text-white'}`}>
            <LayoutDashboard className="size-5" />
            <span className="text-[10px] font-medium">Dashboard</span>
          </Link>
          <Link href="/projects" className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${pathname.startsWith('/projects') ? 'text-blue-400' : 'text-muted-foreground hover:text-white'}`}>
            <CalendarDays className="size-5" />
            <span className="text-[10px] font-medium">Projects</span>
          </Link>
          <Link href="/invoices" className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${pathname.startsWith('/invoices') ? 'text-blue-400' : 'text-muted-foreground hover:text-white'}`}>
            <FileText className="size-5" />
            <span className="text-[10px] font-medium">Invoices</span>
          </Link>
          <button type="button" onClick={() => setIsMobileOpen(true)} className={`flex flex-col items-center justify-center w-full h-full space-y-1 cursor-pointer touch-manipulation ${isMobileOpen ? 'text-blue-400' : 'text-muted-foreground hover:text-white'}`}>
            <Menu className="size-5" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </div>
    </div>
  );
}
