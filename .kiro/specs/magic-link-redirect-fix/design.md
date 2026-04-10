# Magic Link Redirect Fix - Bugfix Design

## Overview

In production (HTTPS), Better Auth automatically prefixes its session cookie with `__Secure-`,
making the cookie name `__Secure-better-auth.session_token`. The `proxy` function in
`apps/admin/src/proxy.ts` only checks for the plain name `better-auth.session_token`, which
does not exist in production. Consequently, after a successful magic link verification sets the
`__Secure-` prefixed cookie, the middleware sees no recognised cookie and redirects the user
back to `/login`.

The fix is minimal: extend the cookie lookup to accept either the `__Secure-` prefixed name
(production/HTTPS) or the plain name (local dev/HTTP).

## Glossary

- **Bug_Condition (C)**: A request that carries `__Secure-better-auth.session_token` but NOT
  `better-auth.session_token` — i.e. a legitimate production session that the current middleware
  incorrectly treats as unauthenticated.
- **Property (P)**: The desired behaviour when the bug condition holds — the proxy SHALL allow
  the request through (`NextResponse.next()`) instead of redirecting to `/login`.
- **Preservation**: All existing behaviours that must remain unchanged after the fix, including
  unauthenticated redirects, auth-path allowlisting, rate limiting, and static-asset exclusion.
- **proxy**: The exported function in `apps/admin/src/proxy.ts` that acts as the Next.js
  middleware entry point, enforcing authentication and rate limiting.
- **sessionToken**: The Better Auth session cookie. Its name is `better-auth.session_token` in
  HTTP environments and `__Secure-better-auth.session_token` in HTTPS environments.

## Bug Details

### Bug Condition

The bug manifests when a request arrives carrying only the `__Secure-better-auth.session_token`
cookie (i.e. a production/HTTPS environment). The `proxy` function calls
`request.cookies.get('better-auth.session_token')`, which returns `undefined` because the
cookie was stored under the prefixed name. The function then issues a redirect to `/login`
even though the user is authenticated.

**Formal Specification:**

```
FUNCTION isBugCondition(request)
  INPUT: request of type NextRequest
  OUTPUT: boolean

  hasSecureCookie  := request.cookies.get('__Secure-better-auth.session_token') IS NOT undefined
  hasPlainCookie   := request.cookies.get('better-auth.session_token') IS NOT undefined
  isProtectedPath  := request.nextUrl.pathname != '/login'
                      AND NOT request.nextUrl.pathname.startsWith('/api/auth/')

  RETURN hasSecureCookie AND NOT hasPlainCookie AND isProtectedPath
END FUNCTION
```

### Examples

- Request to `/dashboard` with `__Secure-better-auth.session_token=abc` cookie:
  current behaviour → redirect to `/login`; expected behaviour → `NextResponse.next()`
- Request to `/dashboard` with `better-auth.session_token=abc` cookie (local dev):
  current behaviour → `NextResponse.next()` (works correctly, must be preserved)
- Request to `/dashboard` with no session cookie:
  current behaviour → redirect to `/login`; expected behaviour → redirect to `/login` (unchanged)
- Request to `/login` with `__Secure-better-auth.session_token=abc` cookie:
  current behaviour → `NextResponse.next()` (allowlisted, must be preserved)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Requests carrying no session cookie (neither plain nor `__Secure-` prefixed) MUST continue
  to be redirected to `/login`.
- Requests to `/login` or any `/api/auth/` path MUST continue to pass through unconditionally,
  regardless of cookie presence.
- Requests to `/api/auth/` endpoints that exceed the rate limit MUST continue to receive a
  `429 Too Many Requests` response.
- Static assets matched by the middleware `config.matcher` exclusion pattern MUST continue to
  be excluded from middleware processing.

**Scope:**
All requests that do NOT match the bug condition (i.e. requests that already carry the plain
`better-auth.session_token`, requests with no session cookie, and requests to allowlisted paths)
must be completely unaffected by this fix.

## Hypothesized Root Cause

Based on the bug description and the source of `apps/admin/src/proxy.ts`:

1. **Hard-coded plain cookie name**: The single call
   `request.cookies.get('better-auth.session_token')` does not account for the `__Secure-`
   prefix that browsers and Better Auth apply automatically in HTTPS contexts (per the
   [Secure cookie prefix spec](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#cookie_prefixes)).

2. **No environment-aware lookup**: There is no logic to detect whether the request arrived
   over HTTPS and adjust the cookie name accordingly.

3. **No fallback lookup**: The code does not fall back to the prefixed name when the plain
   name is absent.

The root cause is (1) — the fix requires checking both cookie names so that either a plain
(dev) or prefixed (production) session cookie is accepted.

## Correctness Properties

Property 1: Bug Condition - Secure-Prefixed Cookie Grants Access

_For any_ request where the bug condition holds (isBugCondition returns true) — i.e. the
request targets a protected path and carries `__Secure-better-auth.session_token` but not
`better-auth.session_token` — the fixed `proxy` function SHALL return `NextResponse.next()`
and SHALL NOT redirect to `/login`.

**Validates: Requirements 2.1**

Property 2: Preservation - Unauthenticated Requests Still Redirected

_For any_ request where the bug condition does NOT hold AND the request carries neither
`__Secure-better-auth.session_token` nor `better-auth.session_token` AND the path is not
allowlisted, the fixed `proxy` function SHALL produce the same result as the original function:
a redirect to `/login`.

**Validates: Requirements 3.1**

Property 3: Preservation - Allowlisted Paths Always Pass Through

_For any_ request where the bug condition does NOT hold AND the pathname is `/login` or starts
with `/api/auth/`, the fixed `proxy` function SHALL return `NextResponse.next()` regardless of
cookie presence, identical to the original function.

**Validates: Requirements 3.2, 3.3**

## Fix Implementation

### Changes Required

**File**: `apps/admin/src/proxy.ts`

**Function**: `proxy`

**Specific Changes**:

1. **Replace single cookie lookup with dual lookup**: Instead of
   `request.cookies.get('better-auth.session_token')`, check both:
   - `request.cookies.get('__Secure-better-auth.session_token')`
   - `request.cookies.get('better-auth.session_token')`

2. **Accept either cookie as valid**: The session is considered present if either cookie
   exists. A simple `||` (or `??`) between the two `get` calls is sufficient.

3. **No other changes**: Rate limiting, allowlist logic, and the `config.matcher` export
   remain untouched.

**Pseudocode of fixed check:**

```
// Before
const sessionToken = request.cookies.get('better-auth.session_token')

// After
const sessionToken =
  request.cookies.get('__Secure-better-auth.session_token') ??
  request.cookies.get('better-auth.session_token')
```

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that
demonstrate the bug on unfixed code, then verify the fix works correctly and preserves
existing behaviour.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix.
Confirm or refute the root cause analysis.

**Test Plan**: Construct a mock `NextRequest` targeting a protected path (e.g. `/dashboard`)
with only the `__Secure-better-auth.session_token` cookie set. Call the unfixed `proxy`
function and assert that the response is NOT a redirect — this assertion will FAIL on unfixed
code, confirming the bug.

**Test Cases**:
1. **Secure cookie only — protected path** (will fail on unfixed code): Request to `/dashboard`
   with `__Secure-better-auth.session_token` set; expect `NextResponse.next()`.
2. **Secure cookie on allowlisted path** (should pass even on unfixed code): Request to
   `/login` with `__Secure-better-auth.session_token` set; expect `NextResponse.next()`.
3. **Both cookies present** (should pass even on unfixed code): Request to `/dashboard` with
   both cookies set; expect `NextResponse.next()`.
4. **No cookies — protected path** (should redirect on both unfixed and fixed code): Request
   to `/dashboard` with no cookies; expect redirect to `/login`.

**Expected Counterexamples**:
- Test case 1 returns a redirect response instead of `NextResponse.next()`.
- Confirms root cause: the plain cookie name lookup misses the `__Secure-` prefixed cookie.

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces
the expected behaviour.

**Pseudocode:**

```
FOR ALL request WHERE isBugCondition(request) DO
  result := proxy_fixed(request)
  ASSERT result.status != 302
  ASSERT result is NextResponse.next()
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function
produces the same result as the original function.

**Pseudocode:**

```
FOR ALL request WHERE NOT isBugCondition(request) DO
  ASSERT proxy_original(request) equivalent_to proxy_fixed(request)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain.
- It catches edge cases that manual unit tests might miss.
- It provides strong guarantees that behaviour is unchanged for all non-buggy inputs.

**Test Plan**: Observe behaviour on UNFIXED code first for requests without the `__Secure-`
cookie, then write property-based tests capturing that behaviour.

**Test Cases**:
1. **Plain cookie preservation**: Verify requests with `better-auth.session_token` still pass
   through after the fix.
2. **No-cookie redirect preservation**: Verify requests with no session cookie still redirect
   to `/login` after the fix.
3. **Allowlist preservation**: Verify `/login` and `/api/auth/*` paths still pass through
   unconditionally after the fix.
4. **Rate limit preservation**: Verify that exceeding the rate limit on `/api/auth/` still
   returns `429` after the fix.

### Unit Tests

- Test `proxy` with only `__Secure-better-auth.session_token` cookie on a protected path →
  expect `NextResponse.next()`.
- Test `proxy` with only `better-auth.session_token` cookie on a protected path →
  expect `NextResponse.next()`.
- Test `proxy` with both cookies on a protected path → expect `NextResponse.next()`.
- Test `proxy` with no cookies on a protected path → expect redirect to `/login`.
- Test `proxy` on `/login` with no cookies → expect `NextResponse.next()`.
- Test `proxy` on `/api/auth/signin` with no cookies → expect `NextResponse.next()`.

### Property-Based Tests

- Generate random protected pathnames and verify that any request carrying at least one valid
  session cookie (plain or `__Secure-` prefixed) always returns `NextResponse.next()`.
- Generate random non-auth pathnames with no cookies and verify the fixed proxy always
  redirects, matching the original proxy behaviour.
- Generate random allowlisted paths (`/login`, `/api/auth/*`) and verify the fixed proxy
  always passes through, matching the original proxy behaviour.

### Integration Tests

- Simulate a full magic link flow in a test environment: send magic link, follow verification
  URL, assert the subsequent request to a protected page is not redirected.
- Verify that switching between HTTP (plain cookie) and HTTPS (prefixed cookie) environments
  both result in successful authentication.
