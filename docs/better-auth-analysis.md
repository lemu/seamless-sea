# Better Auth + Convex Integration Analysis

**Date:** 2025-12-12
**Status:** For future reference - Currently using Convex Auth (beta)

## Background

During migration from Better Auth to Convex Auth, we encountered session persistence issues. This document analyzes what we learned from the official Better Auth + Convex integration guide and what was missing from our implementation.

## Official Better Auth + Convex Setup

**Documentation:** https://convex-better-auth.netlify.app/framework-guides/react

### Client-Side Configuration

```typescript
// src/lib/auth-client.ts
import { createBetterAuthClient } from "better-auth/client";
import { convexClient, crossDomainClient } from "@convex-dev/better-auth/react";

export const authClient = createBetterAuthClient({
  baseURL: import.meta.env.VITE_CONVEX_SITE_URL, // Critical: Use Convex site URL, not localhost
  plugins: [
    convexClient(),
    crossDomainClient({
      cookieAttributes: {
        sameSite: "none",  // Required for cross-domain cookies
        secure: true       // Required when sameSite is "none"
      }
    })
  ]
});
```

```typescript
// src/main.tsx
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";
import { authClient } from "./lib/auth-client";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

<ConvexBetterAuthProvider client={convex} betterAuthClient={authClient}>
  <App />
</ConvexBetterAuthProvider>
```

### Server-Side Configuration

```typescript
// convex/auth.ts
import { convexAuth } from "@convex-dev/better-auth/convex";
import { betterAuth } from "better-auth";
import { Password } from "better-auth/providers";
import { crossDomain } from "@convex-dev/better-auth/server";

export const auth = betterAuth({
  database: betterAuthAdapter(),
  emailAndPassword: { enabled: true },
  baseURL: process.env.CONVEX_SITE_URL, // Must match client baseURL
  plugins: [crossDomain()], // Critical: Enables cross-domain communication
});

export const { signIn, signOut, store } = convexAuth({
  providers: [Password],
});
```

## Critical Missing Pieces in Our Implementation

### 1. Cross-Domain Plugin Configuration

**Missing Server Plugin:**
```typescript
plugins: [crossDomain()]
```

**Missing Client Plugins:**
```typescript
plugins: [
  convexClient(),
  crossDomainClient({ cookieAttributes: { sameSite: "none", secure: true } })
]
```

**Why This Matters:**
- Better Auth runs on Convex's infrastructure (`*.convex.site`)
- Your React app runs on a different domain (`localhost:5173` or your deployment)
- Without cross-domain setup, cookies won't be sent across origins
- Session persistence fails because auth cookies are blocked by browser security

### 2. Cookie SameSite Policy

**The Issue:**
- Modern browsers block cross-origin cookies by default
- Without `sameSite: "none"`, cookies only work on same domain
- Without `secure: true`, browsers reject `sameSite: "none"` cookies

**The Fix:**
```typescript
cookieAttributes: {
  sameSite: "none",  // Allow cross-origin cookie sending
  secure: true       // Required for sameSite: "none"
}
```

### 3. Base URL Configuration

**Wrong:**
```typescript
baseURL: "http://localhost:5173"
```

**Correct:**
```typescript
baseURL: import.meta.env.VITE_CONVEX_SITE_URL
// Example: "https://useful-toucan-91.convex.site"
```

**Why:** Better Auth endpoints live on the Convex site domain, not your app domain.

## What Was Wrong With Our Setup

Based on the deleted `src/lib/auth-client.ts`:
```typescript
export const authClient = null;
```

This indicates we had:
- ❌ No Better Auth client configured at all
- ❌ No cross-domain plugins
- ❌ No proper cookie configuration
- ❌ Incomplete server-side setup (missing crossDomain plugin)

**Root Cause:** Our session persistence issues were caused by missing cross-domain configuration, not a fundamental Better Auth problem.

## Why We Migrated to Convex Auth Anyway

Despite Better Auth being fixable, we chose Convex Auth because:

### 1. **Simplicity**
- **Convex Auth:** Single provider configuration, no cross-domain plugins needed
- **Better Auth:** Requires 3+ plugins (convexClient, crossDomainClient, crossDomain)

### 2. **Official Support**
- **Convex Auth:** First-party solution, designed specifically for Convex
- **Better Auth:** Third-party integration with extra compatibility layer

### 3. **Maintenance**
- **Convex Auth:** Maintained by Convex team, guaranteed compatibility
- **Better Auth:** Requires keeping `@convex-dev/better-auth` adapter updated

### 4. **Current Status**
- **Convex Auth:** Working perfectly, clean implementation, full cleanup complete
- **Better Auth:** Would require re-implementing with proper plugins

### 5. **Beta Consideration**
- **Convex Auth:** Yes, it's in beta, but officially supported by Convex
- **Better Auth:** Mature library, but integration layer also requires maintenance

## Future Experimentation: Better Auth Branch

If we want to try Better Auth properly configured:

### 1. Create Branch
```bash
git checkout -b experiment/better-auth
```

### 2. Implementation Checklist
- [ ] Install Better Auth dependencies
  ```bash
  npm install better-auth @convex-dev/better-auth
  ```
- [ ] Configure server `crossDomain()` plugin
- [ ] Configure client `convexClient()` and `crossDomainClient()` plugins
- [ ] Set `baseURL: import.meta.env.VITE_CONVEX_SITE_URL`
- [ ] Configure cookie attributes: `{ sameSite: "none", secure: true }`
- [ ] Set up `ConvexBetterAuthProvider` wrapper
- [ ] Add `BETTER_AUTH_SECRET` to environment
- [ ] Add `VITE_CONVEX_SITE_URL` to environment
- [ ] Test session persistence across page refreshes
- [ ] Test cross-domain cookie behavior
- [ ] Compare complexity vs Convex Auth

### 3. Testing Focus
- Session persistence across page refreshes
- Cross-domain cookie behavior (check browser dev tools)
- Login/logout flows
- Protected routes
- Performance vs Convex Auth
- Developer experience

### 4. Decision Criteria
Keep Better Auth if:
- Significantly better features for our use case
- More mature invite system
- Better documentation for advanced flows

Stick with Convex Auth if:
- Simpler to maintain
- Equivalent functionality
- Faster performance
- Better TypeScript support

## Key Takeaways

1. **Better Auth + Convex CAN work** - We just didn't configure it properly
2. **Cross-domain setup is critical** - Most session issues stem from missing plugins
3. **Convex Auth is simpler** - Less configuration, fewer moving parts
4. **Both are viable options** - Choose based on features needed vs complexity tolerance
5. **Our migration was correct** - Given incomplete setup and Convex Auth working perfectly

## Resources

- Better Auth + Convex Guide: https://convex-better-auth.netlify.app/framework-guides/react
- Better Auth Docs: https://better-auth.com
- Convex Auth Docs: https://docs.convex.dev/auth
- Cross-Domain Cookies: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite

---

*This analysis is preserved for future reference. Current implementation uses Convex Auth successfully.*
