# Bugfix Requirements Document

## Introduction

In production (HTTPS), Better Auth automatically applies the `__Secure-` prefix to its session cookie, making the cookie name `__Secure-better-auth.session_token`. The middleware in `apps/admin/src/proxy.ts` only checks for the plain name `better-auth.session_token`, which does not exist in production. As a result, even after a successful magic link verification sets the session cookie, the middleware sees no cookie and redirects the user back to `/login`.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a request arrives in a production (HTTPS) environment after magic link verification THEN the system redirects to `/login` because the middleware only checks for `better-auth.session_token` and the `__Secure-better-auth.session_token` cookie is not found

1.2 WHEN a request carries only the `__Secure-better-auth.session_token` cookie THEN the system treats the request as unauthenticated and issues a redirect to `/login`

### Expected Behavior (Correct)

2.1 WHEN a request arrives with the `__Secure-better-auth.session_token` cookie (production/HTTPS) THEN the system SHALL recognise the session as valid and allow the request through without redirecting

2.2 WHEN a request arrives with the `better-auth.session_token` cookie (local dev/HTTP) THEN the system SHALL recognise the session as valid and allow the request through without redirecting

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a request carries neither `__Secure-better-auth.session_token` nor `better-auth.session_token` THEN the system SHALL CONTINUE TO redirect the request to `/login`

3.2 WHEN a request targets `/login` or any `/api/auth/` path THEN the system SHALL CONTINUE TO allow the request through unconditionally regardless of cookie presence

3.3 WHEN a request to an `/api/auth/` endpoint exceeds the rate limit THEN the system SHALL CONTINUE TO return a `429 Too Many Requests` response

3.4 WHEN a request targets static assets matched by the middleware exclusion pattern THEN the system SHALL CONTINUE TO be excluded from middleware processing
