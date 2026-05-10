'use client';

import { NotFoundView } from '@/components/ui/not-found-view';

// System group: Settings · Users · Organisation · Billing · Security · Data
export default function SettingsNotFound() {
  return (
    <NotFoundView
      noun="settings page"
      links={[
        { label: 'Organisation',   href: '/settings/organisation' },
        { label: 'Billing',        href: '/settings/billing'      },
        { label: 'Users',          href: '/settings/users'        },
        { label: 'Security',       href: '/settings/security'     },
        { label: 'Data & Exports', href: '/settings/data'         },
      ]}
    />
  );
}
