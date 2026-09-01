# 1. Portal Overview & Access

> Learn how clients authenticate securely using passwordless magic links and how administrators use impersonation to provide support.

---

## Multi-Domain Brand Isolation

The Client Portal serves clients from distinct domains depending on the division they engage with:

- **Playhouse Media Group & Apex Web Solutions**: `https://portal.playhousemedia.co.za`
- **TenderEdge Solutions**: `https://portal.tenderedgesolutions.co.za`

The portal automatically applies the correct division logo, primary color scheme, and typography based on the requesting domain.

---

## Passwordless Magic Link Authentication

To eliminate password reset tickets and protect client accounts:

1. **Client visits portal URL**: The client enters their registered email address.
2. **Magic Link Dispatched**: The system sends a one-time sign-in link via Resend.
3. **Instant Sign-In**: Clicking the link authenticates the user immediately via Better Auth session cookies without needing a password.
4. **Session Persistence**: Sessions remain active securely across browser restarts.

---

## Admin Impersonation (Zero-Friction Client Support)

Administrators frequently need to see exactly what a client sees to answer billing questions or verify tender submissions.

### How to Impersonate a Client:

1. In the Admin app (`apps/admin`), navigate to `Relationships -> Clients`.
2. Click on the target client's profile.
3. Click the **Impersonate Client** button in the page header.
4. The system signs an HMAC session cookie and securely redirects you into the Client Portal as that client.
5. An amber banner appears at the top: _"You are viewing as [Client Name] (Impersonation Mode)"_ with an option to return to Admin.

---

## Developer Mode User Selector (Local Development)

In local development environments (`NODE_ENV === 'development'`):

- The portal login screen displays an interactive **Dev Mode User Switcher**.
- Developers can select any seeded client from a dropdown and sign in with a single click, eliminating the need to wait for email delivery when testing.
