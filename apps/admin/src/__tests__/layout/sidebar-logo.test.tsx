import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppSidebar } from '../../components/layout/app-sidebar';
import { TooltipProvider } from '../../components/ui/tooltip';
import { SidebarProvider } from '../../components/ui/sidebar';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

vi.mock('@/components/layout/sign-out-button', () => ({
  SignOutButton: () => <button>Sign Out</button>,
}));

describe('AppSidebar Logo', () => {
  const mockUser = {
    name: 'Test User',
    email: 'test@example.com',
    role: 'super_admin',
  };

  it('should render the PMG logo in the sidebar', () => {
    render(
      <TooltipProvider>
        <SidebarProvider>
          <AppSidebar user={mockUser} />
        </SidebarProvider>
      </TooltipProvider>
    );

    // Initial test checks for current text-based logo
    // Once implemented, this will be updated to check for the Image component
    const logoLabel = screen.queryByText(/Control Center/i);
    expect(logoLabel).toBeInTheDocument();
  });
});
