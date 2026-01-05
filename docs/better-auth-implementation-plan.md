# Better Auth + Convex Implementation Plan

**Date:** 2025-12-15
**Status:** Research Complete - Ready for Implementation
**Branch:** `migration-to-better-auth`

---

## Executive Summary

This document provides a comprehensive analysis of why the previous Better Auth implementation failed and a detailed plan for successful implementation. The research reveals that the previous attempt was **85% correct** but failed due to missing cookie configuration and incomplete testing.

---

## Part 1: Why the Previous Implementation Failed

### Root Cause Analysis

Based on analysis of the `better-auth-implementation` branch and GitHub issues, the failure was caused by:

| Issue | Severity | Status in Previous Branch |
|-------|----------|---------------------------|
| Missing `sameSite: "none"` cookie attribute | **Critical** | Missing |
| Missing `secure: true` cookie attribute | **Critical** | Missing |
| Cross-domain plugins present | Required | Present |
| Server-side crossDomain plugin | Required | Present |
| Correct baseURL configuration | Required | Present |
| Protected routes | High | Missing |
| Session persistence testing | Critical | Never done |

### The Cookie Problem Explained

Better Auth with Convex operates in a **cross-domain architecture**:

```
Your React App                    Convex Backend
localhost:5173          <--->     *.convex.site
OR
yourdomain.com          <--->     your-app.convex.site
```

**Why cookies fail without explicit configuration:**

1. **Browser Security**: Modern browsers block cross-origin cookies by default
2. **SameSite Policy**: Default `Lax` only sends cookies on same-origin requests
3. **Safari Strict Mode**: Safari blocks all cross-site cookies by default
4. **Partitioned Cookies**: Chrome's new cookie partitioning affects cross-origin flows

**The Fix:**
```typescript
crossDomainClient({
  cookieAttributes: {
    sameSite: "none",  // Allow cross-origin cookie sending
    secure: true       // Required when sameSite is "none"
  }
})
```

### Evidence from GitHub Issues

- [Issue #4038](https://github.com/better-auth/better-auth/issues/4038): Cross-domain cookies not being set in production
- [Issue #2962](https://github.com/better-auth/better-auth/issues/2962): Authentication cookies not being set on cross-domain requests
- [Issue #1006](https://github.com/better-auth/better-auth/issues/1006): `useSession()` not always triggering state change
- [Issue #158](https://github.com/get-convex/better-auth/issues/158): Auto sign-in after email verification not working

**Common thread:** All these issues stem from improper cookie configuration in cross-domain setups.

---

## Part 2: Current Codebase State

### Current Authentication: bcrypt-based

The codebase currently uses a simple bcrypt-based authentication:

**Pros:**
- Simple, no external dependencies
- No cross-domain complexity
- Works reliably

**Cons:**
- Manual session management via localStorage
- No OAuth support
- No magic links, email OTP, or password reset
- No refresh token rotation
- Manual session cleanup required

### What Needs to Change

| Component | Current | Better Auth |
|-----------|---------|-------------|
| Session Storage | localStorage | HTTP-only cookies |
| Session Validation | Manual token check | Automatic with middleware |
| Provider | ConvexProvider only | ConvexBetterAuthProvider |
| Auth Client | None | `createAuthClient` |
| Schema | Custom sessions table | Better Auth tables |
| Password Hashing | bcryptjs | Built-in |

---

## Part 3: Official Implementation Guide

### Required Dependencies

```bash
# Install with exact version (pinned for compatibility)
npm install better-auth@1.3.34 --save-exact
npm install @convex-dev/better-auth convex@latest
```

### 1. Convex Configuration (`convex/convex.config.ts`)

```typescript
import { defineApp } from "convex/server";
import betterAuth from "@convex-dev/better-auth/convex.config";

const app = defineApp();
app.use(betterAuth);

export default app;
```

### 2. Server-Side Auth (`convex/auth.ts`)

```typescript
import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";

export const authComponent = createClient("better-auth", { verbose: false });

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    secret: process.env.BETTER_AUTH_SECRET!,
    trustedOrigins: [process.env.SITE_URL!],
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    plugins: [
      crossDomain({ siteUrl: process.env.SITE_URL! }),
      convex(),
    ],
  });
};

// Helper functions
export const safeGetUser = authComponent.safeGetUser;
export const getUser = authComponent.getUser;
export const getUserId = authComponent.getUserId;

// Query to get current user
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await safeGetUser(ctx);
    return user;
  },
});
```

### 3. HTTP Routes (`convex/http.ts`)

```typescript
import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();

// Register Better Auth routes with CORS enabled
authComponent.registerRoutes(http, createAuth, { cors: true });

export default http;
```

### 4. Client-Side Auth (`src/lib/auth-client.ts`)

**CRITICAL: This is where the previous implementation failed**

```typescript
import { createAuthClient } from "better-auth/react";
import {
  convexClient,
  crossDomainClient,
} from "@convex-dev/better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_CONVEX_SITE_URL,
  plugins: [
    // CRITICAL: Cookie attributes must be explicit
    crossDomainClient({
      cookieAttributes: {
        sameSite: "none",  // <-- THIS WAS MISSING
        secure: true       // <-- THIS WAS MISSING
      }
    }),
    convexClient(),
  ],
});
```

### 5. Provider Setup (`src/main.tsx`)

```typescript
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexReactClient } from "convex/react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { authClient } from "./lib/auth-client";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexBetterAuthProvider client={convex} authClient={authClient}>
      <App />
    </ConvexBetterAuthProvider>
  </StrictMode>
);
```

### 6. Environment Variables

```bash
# .env.local (client-side)
VITE_CONVEX_URL=https://your-app.convex.cloud
VITE_CONVEX_SITE_URL=https://your-app.convex.site

# Convex Dashboard (server-side)
BETTER_AUTH_SECRET=your-256-bit-secret
SITE_URL=https://your-production-domain.com
```

Generate secret:
```bash
openssl rand -base64 32
```

---

## Part 4: Implementation Checklist

### Phase 1: Setup (Do First)

- [ ] Create feature branch from main
- [ ] Install dependencies with exact versions
- [ ] Generate `BETTER_AUTH_SECRET`
- [ ] Configure environment variables in Convex Dashboard
- [ ] Create `.env.local` with client-side variables

### Phase 2: Server-Side (Convex)

- [ ] Create/update `convex/convex.config.ts`
- [ ] Create/update `convex/auth.ts` with full configuration
- [ ] Create/update `convex/http.ts` with route registration
- [ ] Run `npx convex dev` to verify schema generation
- [ ] Check Convex Dashboard for Better Auth tables

### Phase 3: Client-Side (React)

- [ ] Create `src/lib/auth-client.ts` with **explicit cookie attributes**
- [ ] Update `src/main.tsx` with `ConvexBetterAuthProvider`
- [ ] Update `UserContext.tsx` to use `authClient.useSession()`
- [ ] Update `Login.tsx` to use `authClient.signIn.email()`
- [ ] Update `SignUp.tsx` to use `authClient.signUp.email()`
- [ ] Update `SignOut.tsx` to use `authClient.signOut()`

### Phase 4: Testing (Critical - Don't Skip)

- [ ] Test login flow in development
- [ ] Test session persistence after page refresh
- [ ] Test session persistence after closing/reopening tab
- [ ] Test logout from all tabs
- [ ] Test in Chrome Incognito mode
- [ ] Test in Safari (strictest cookie policies)
- [ ] Test in Firefox
- [ ] Inspect cookies in DevTools → Application → Cookies
- [ ] Verify `SameSite=None` and `Secure` flags are present

### Phase 5: Production Deployment

- [ ] Set `SITE_URL` to production domain in Convex Dashboard
- [ ] Verify HTTPS is configured (required for `Secure` cookies)
- [ ] Test full auth flow in production
- [ ] Monitor for cookie-related errors in browser console

---

## Part 5: Migration Strategy

### Option A: Clean Migration (Recommended)

1. **Create new branch** from main
2. **Replace authentication entirely**
3. **Migrate existing users** via script:
   - Export users from current `users` table
   - Better Auth will create its own user records
   - Map old user IDs to new user IDs in related tables

### Option B: Gradual Migration

1. **Run both auth systems** temporarily
2. **Migrate users on first login** after Better Auth implementation
3. **Remove bcrypt auth** after all users migrated

### User Migration Script Outline

```typescript
// scripts/migrate-to-better-auth.ts
import { api } from "../convex/_generated/api";

// For each user in the old system:
// 1. Create Better Auth user record
// 2. Update all foreign keys (memberships, orders, etc.)
// 3. Mark old user as migrated
```

---

## Part 6: Common Pitfalls to Avoid

### 1. Don't Skip Cookie Configuration
```typescript
// WRONG - will cause session issues
crossDomainClient()

// CORRECT - explicit cookie configuration
crossDomainClient({
  cookieAttributes: {
    sameSite: "none",
    secure: true
  }
})
```

### 2. Don't Use Wrong Base URL
```typescript
// WRONG - localhost/your app domain
baseURL: "http://localhost:5173"
baseURL: "https://your-app.com"

// CORRECT - Convex site URL
baseURL: import.meta.env.VITE_CONVEX_SITE_URL
```

### 3. Don't Forget CORS
```typescript
// WRONG - no CORS
authComponent.registerRoutes(http, createAuth);

// CORRECT - CORS enabled
authComponent.registerRoutes(http, createAuth, { cors: true });
```

### 4. Don't Forget Server-Side Plugins
```typescript
// WRONG - missing plugins
betterAuth({
  // ... config without plugins
});

// CORRECT - both plugins required
betterAuth({
  plugins: [
    crossDomain({ siteUrl: process.env.SITE_URL! }),
    convex(),
  ],
});
```

### 5. Don't Skip Testing
The previous implementation was **85% correct** but failed because it was never tested. Session persistence issues only appear after:
- Page refresh
- Tab close/reopen
- Different browsers (especially Safari)
- Incognito mode
- Production deployment

---

## Part 7: Debugging Guide

### Check 1: Are cookies being set?

Open DevTools → Application → Cookies → your-app.convex.site

Look for:
- `better-auth.session_token` (or similar)
- `SameSite=None`
- `Secure=true`
- `HttpOnly=true`

### Check 2: Network requests

Open DevTools → Network → Filter by "auth"

Check:
- Requests to `*.convex.site/api/auth/*`
- Response headers contain `Set-Cookie`
- Subsequent requests include `Cookie` header

### Check 3: Console errors

Look for:
- CORS errors
- Cookie-related warnings
- "SameSite" warnings in Chrome

### Check 4: Convex Dashboard

- Check `betterAuth:sessions` table for session records
- Check `betterAuth:users` table for user records
- Check function logs for auth-related errors

---

## Part 8: Timeline and Next Steps

### Recommended Approach

1. **Start fresh** - Don't try to merge the old `better-auth-implementation` branch
2. **Follow this guide step-by-step** - Don't skip any steps
3. **Test thoroughly** - Especially session persistence
4. **Deploy to staging first** - Test in production-like environment before going live

### Decision Point

Before implementing, consider:

| Factor | bcrypt (Current) | Better Auth |
|--------|------------------|-------------|
| Complexity | Low | Medium |
| Features | Basic | Full (OAuth, magic links, etc.) |
| Session Security | localStorage (XSS risk) | HTTP-only cookies |
| Maintenance | Manual | Automatic |
| Cross-domain | Not needed | Required |

**Recommendation:** If you only need email/password auth and don't need OAuth or advanced features, the current bcrypt implementation is simpler and working. Better Auth adds complexity primarily for additional features.

---

## Sources

- [Convex + Better Auth React Guide](https://convex-better-auth.netlify.app/framework-guides/react)
- [Better Auth Cookies Documentation](https://www.better-auth.com/docs/concepts/cookies)
- [Better Auth Session Management](https://www.better-auth.com/docs/concepts/session-management)
- [GitHub: Cross-Domain Cookie Issues #4038](https://github.com/better-auth/better-auth/issues/4038)
- [GitHub: Authentication Cookies Not Set #2962](https://github.com/better-auth/better-auth/issues/2962)
- [GitHub: useSession Not Triggering #1006](https://github.com/better-auth/better-auth/issues/1006)
- [GitHub: Auto Sign-in Not Working #158](https://github.com/get-convex/better-auth/issues/158)
- [Convex Better Auth Example Repository](https://github.com/get-convex/better-auth/tree/main/examples/react)

---

*This plan addresses all issues identified in the previous implementation attempt and provides a clear path to successful Better Auth integration.*
