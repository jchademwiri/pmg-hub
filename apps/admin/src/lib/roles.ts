/**
 * Shared role hierarchy — no `server-only` import, so this is safe to use
 * from both server code (e.g. `auth.ts`) and client components (e.g. the
 * sidebar nav, which filters items by role).
 */

export const ROLE_HIERARCHY = { super_admin: 3, admin: 2, viewer: 1 } as const;

export type Role = keyof typeof ROLE_HIERARCHY;

/**
 * Returns true if `userRole` meets or exceeds `minRole` in the hierarchy.
 * Unknown/missing roles are treated as the lowest tier ('viewer').
 */
export function canAccess(userRole: string | undefined, minRole: Role): boolean {
  const userLevel = ROLE_HIERARCHY[(userRole as Role) ?? 'viewer'] ?? ROLE_HIERARCHY.viewer;
  return userLevel >= ROLE_HIERARCHY[minRole];
}
