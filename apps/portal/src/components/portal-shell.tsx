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
  X,
  CalendarDays,
} from 'lucide-react';
import Link from 'next/link';

interface PortalShellProps {
  client: any;
  children: React.ReactNode;
}

export function PortalShell({ client, children }: PortalShellProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const pathname = usePathname();

  const NAV_ITEMS = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Projects', href: '/projects', icon: CalendarDays },
    { label: 'Invoices', href: '/invoices', icon: FileText },
    { label: 'Quotes', href: '/quotes', icon: FileSpreadsheet },
    { label: 'Statements', href: '/statements', icon: Receipt },
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
                className={`flex items-center gap-3 px-2.5 py-2 text-sm font-medium rounded-lg transition-all group relative ${
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
            <a
              href="/login"
              className={`flex items-center gap-3 px-2.5 py-2 text-sm font-medium text-red-400 rounded-lg hover:text-red-300 hover:bg-red-500/5 transition-all group relative ${
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
            </a>

            {/* Collapse Toggle Button */}
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:flex h-8 items-center justify-center rounded-lg border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] text-muted-foreground hover:text-white transition-all"
            >
              {isCollapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Sidebar */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
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
                className="text-muted-foreground hover:text-white"
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
                    className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
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
              <a
                href="/login"
                className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-red-400 rounded-lg hover:text-red-300 hover:bg-red-500/5 transition-all"
              >
                <LogOut className="size-4 shrink-0" />
                <span>Sign Out</span>
              </a>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/5 bg-[#0a0f1d] px-6 sticky top-0 z-30 print:hidden">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              className="p-1 text-muted-foreground hover:text-white md:hidden"
              title="Open Menu"
            >
              <Menu className="size-5" />
            </button>
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

        {/* Content Body */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
