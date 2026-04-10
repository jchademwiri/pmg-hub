# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Secure-Prefixed Cookie Grants Access
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to the concrete failing case — a request to any protected path carrying only `__Secure-better-auth.session_token`
  - Construct a mock `NextRequest` targeting a protected path (e.g. `/dashboard`) with only `__Secure-better-auth.session_token` set
  - Call the unfixed `proxy` function and assert the response is NOT a redirect (status != 302) and IS `NextResponse.next()`
  - isBugCondition: `hasSecureCookie AND NOT hasPlainCookie AND isProtectedPath`
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (confirms the bug — plain cookie lookup misses the `__Secure-` prefixed cookie)
  - Document counterexamples found (e.g. `proxy(request to /dashboard with __Secure-better-auth.session_token=abc)` returns redirect instead of `NextResponse.next()`)
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Unauthenticated Redirects, Allowlist, and Rate Limiting Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: `proxy(request to /dashboard with better-auth.session_token=abc)` returns `NextResponse.next()` on unfixed code
  - Observe: `proxy(request to /dashboard with no cookies)` returns redirect to `/login` on unfixed code
  - Observe: `proxy(request to /login with no cookies)` returns `NextResponse.next()` on unfixed code
  - Observe: `proxy(request to /api/auth/signin with no cookies)` returns `NextResponse.next()` on unfixed code
  - Observe: `proxy(request to /api/auth/signin exceeding rate limit)` returns `429` on unfixed code
  - Write property-based tests capturing these observed behaviors for all non-bug-condition inputs (where `isBugCondition` returns false)
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Fix for secure-prefixed cookie not recognised in production middleware

  - [x] 3.1 Implement the fix in `apps/admin/src/proxy.ts`
    - Replace `request.cookies.get('better-auth.session_token')` with a dual lookup using `??`
    - New lookup: `request.cookies.get('__Secure-better-auth.session_token') ?? request.cookies.get('better-auth.session_token')`
    - Leave rate limiting, allowlist logic, and `config.matcher` export completely untouched
    - _Bug_Condition: `isBugCondition(request)` — request targets a protected path and carries `__Secure-better-auth.session_token` but not `better-auth.session_token`_
    - _Expected_Behavior: `proxy(request)` returns `NextResponse.next()` for all requests where `isBugCondition` holds_
    - _Preservation: All requests where `isBugCondition` is false must produce identical results to the original `proxy` function_
    - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 3.4_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Secure-Prefixed Cookie Grants Access
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior: `proxy` returns `NextResponse.next()` for requests where `isBugCondition` holds
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Unauthenticated Redirects, Allowlist, and Rate Limiting Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
