# Claude Development Notes

## Preferred File Structure

When working with React contexts and hooks, use the following **preferred file structure** moving forward:

### Context + Hook Separation Pattern

```
src/
├── types/
│   └── [feature].ts           # Pure TypeScript types and interfaces
├── contexts/
│   ├── context.ts             # Pure React context definitions (no JSX)
│   └── [Feature]Context.tsx   # Provider components with business logic
└── hooks/
    ├── index.ts               # Export all hooks from single entry point
    └── use[Feature].ts        # Individual hook implementations
```

### Example Implementation

**Types (`src/types/user.ts`):**
```typescript
export interface User {
  _id: Id<"users">;
  name: string;
  // ...
}

export interface UserContextType {
  user: User | null;
  login: (email: string) => Promise<boolean>;
  // ...
}
```

**Context (`src/contexts/context.ts`):**
```typescript
import { createContext } from 'react';
import type { UserContextType } from '../types/user';

export const UserContext = createContext<UserContextType | undefined>(undefined);
```

**Hook (`src/hooks/useUser.ts`):**
```typescript
import { useContext } from 'react';
import type { UserContextType } from '../types/user';
import { UserContext } from '../contexts/context';

export function useUser(): UserContextType {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
```

**Hook Index (`src/hooks/index.ts`):**
```typescript
export { useUser } from './useUser';
export { useBreadcrumb } from './useBreadcrumb';
```

**Usage:**
```typescript
import { useUser } from "../hooks";
```

### Benefits

1. **Clean separation** - Types, context, and hooks have single responsibilities
2. **No import issues** - `.ts` files only import from other `.ts` files  
3. **Better organization** - Easy to locate and maintain code
4. **Type safety** - Proper TypeScript exports and imports
5. **Scalable** - Easy to add new hooks and contexts

### Why This Approach

- Avoids TypeScript JSX import issues between `.ts` and `.tsx` files
- Follows React best practices for context/hook separation
- Professional, maintainable code structure used in production apps
- Makes testing and mocking easier

## Code Organization

### Feature-Based Structure

Organize code by feature rather than file type:

```
src/
├── components/           # Shared UI components
│   ├── ui/              # Basic UI primitives
│   └── common/          # Business logic components
├── features/            # Feature-specific code
│   ├── dashboard/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── utils/
│   └── settings/
├── hooks/               # Shared custom hooks
├── utils/               # Shared utilities
└── types/               # TypeScript definitions
```

### Naming Conventions

**Event Handlers:**
```typescript
const handleSubmit = () => { /* ... */ };
const handleInputChange = () => { /* ... */ };
const handleModalClose = () => { /* ... */ };
```

**Custom Hooks:**
```typescript
const useUserProfile = () => { /* ... */ };
const useOptimisticUpdate = () => { /* ... */ };
```

**Component Names:**
```typescript
const UserProfileCard = () => { /* ... */ };
const DataTableSettingsMenu = () => { /* ... */ };
```

**Utility Functions:**
```typescript
const formatUserDisplayName = (user) => { /* ... */ };
const parseLaycanDate = (laycan) => { /* ... */ };
```

## Component Design Patterns

### Compound Components

For flexible composition, use the compound component pattern:

```typescript
const Card = ({ children, className }) => (
  <div className={cn("card", className)}>{children}</div>
);

Card.Header = ({ children }) => (
  <header className="card-header">{children}</header>
);

Card.Content = ({ children }) => (
  <div className="card-content">{children}</div>
);

Card.Footer = ({ children }) => (
  <footer className="card-footer">{children}</footer>
);

// Usage
<Card>
  <Card.Header><h3>Title</h3></Card.Header>
  <Card.Content><p>Content</p></Card.Content>
  <Card.Footer><Button>Action</Button></Card.Footer>
</Card>
```

### Consistent Props Interface

```typescript
interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  "data-testid"?: string;
}

interface ButtonProps extends BaseComponentProps {
  variant?: "primary" | "secondary" | "destructive";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
}
```

## UI Component Guidelines

### Prefer Tide UI Components

When creating UI elements, **always prefer components from `@rafal.lemieszewski/tide-ui`** over custom implementations or other libraries.

**Official Documentation:** https://tide-ui.vercel.app

**✅ Preferred:**
```typescript
import { 
  Button, 
  Input, 
  Card, 
  CardContent, 
  Avatar,
  Icon,
  Badge 
} from "@rafal.lemieszewski/tide-ui";
```

**❌ Avoid:**
- Custom button implementations
- Raw HTML elements for complex UI
- Other UI libraries (unless specifically required)

### Benefits

- **Consistent design system** - Maintains visual consistency across the app
- **Accessibility built-in** - Tide UI components follow accessibility standards  
- **Theme support** - Components respect the application's theme variables
- **Tested components** - Pre-tested, reliable implementations
- **Reduced bundle size** - Shared component library vs multiple implementations

### When to Create Custom Components

Only create custom components when:
- Tide UI doesn't provide the needed functionality
- Specific business logic requires a wrapper around Tide UI components
- Complex composite components built from multiple Tide UI primitives

**Example of acceptable custom component:**
```typescript
// UserProfileCard.tsx - Business-specific composite
import { Card, CardContent, Avatar, Button } from "@rafal.lemieszewski/tide-ui";

export function UserProfileCard({ user }) {
  return (
    <Card>
      <CardContent>
        <Avatar src={user.avatar} />
        <Button onClick={handleEdit}>Edit Profile</Button>
      </CardContent>
    </Card>
  );
}
```

### Semantic Tailwind Utilities

Use semantic utilities from the design system preset, not arbitrary CSS variable values:

```typescript
// ❌ Bad: Ambiguous — Tailwind can't determine if it's color or font-size
className="text-[var(--color-text-primary)]"

// ✅ Good: Semantic utility from tailwind-preset.js
className="text-text-primary"
```

## Convex Database Guidelines

### Overview

Convex is the backend-as-a-service used for real-time data management. All database operations, queries, and mutations are handled through Convex.

### Project Setup

**Configuration:**
```typescript
// main.tsx
import { ConvexProvider, ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  </StrictMode>
);
```

### Schema Design

**Location:** `convex/schema.ts`

**Best Practices:**
- Start without a schema for rapid prototyping
- Add schema once data model is solidified
- Use `v` validators for type safety
- Every table automatically includes `_id` and `_creationTime`

**Example Schema:**
```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    avatar: v.optional(v.id("_storage")),
    createdAt: v.number(),
  }),

  boards: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),
});
```

**Validator Types:**
- `v.string()` - String values
- `v.number()` - Numeric values
- `v.boolean()` - Boolean values
- `v.id("tableName")` - References to other tables
- `v.optional(type)` - Optional fields
- `v.union(type1, type2)` - Multiple possible types
- `v.literal("value")` - Exact constant value
- `v.array(type)` - Array of values
- `v.object({ ... })` - Nested objects
- `v.any()` - Completely flexible (use sparingly)

### Query Functions

**Location:** `convex/*.ts` files

**Purpose:** Read data from the database. Queries are automatically cached and reactive.

**Best Practices:**
- MUST: Use argument validation
- MUST: Keep queries deterministic
- MUST: Focus on database reads and simple logic
- SHOULD: Use helper functions for complex logic
- NEVER: Make third-party API calls (use Actions instead)

**Example Query:**
```typescript
// convex/users.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();

    // Generate storage URLs if needed
    let avatarUrl = null;
    if (user?.avatar) {
      avatarUrl = await ctx.storage.getUrl(user.avatar);
    }

    return user ? { ...user, avatarUrl } : null;
  },
});
```

**Common Query Patterns:**
```typescript
// Get single document by ID
const user = await ctx.db.get(userId);

// Query with filter
const users = await ctx.db
  .query("users")
  .filter((q) => q.eq(q.field("email"), email))
  .first();

// Query with ordering and limit
const recentBoards = await ctx.db
  .query("boards")
  .order("desc")
  .take(10);

// Collect all results
const allUsers = await ctx.db.query("users").collect();
```

### Mutation Functions

**Purpose:** Write data to the database. Mutations run transactionally.

**Best Practices:**
- MUST: Use argument validation
- MUST: Make handlers deterministic
- MUST: Return meaningful values
- SHOULD: Use for all database writes
- NEVER: Make third-party API calls (use Actions instead)

**Example Mutation:**
```typescript
// convex/boards.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const createBoard = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    userId: v.id("users"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const boardId = await ctx.db.insert("boards", {
      title: args.title,
      description: args.description,
      userId: args.userId,
      organizationId: args.organizationId,
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(boardId);
  },
});

export const updateBoard = mutation({
  args: {
    boardId: v.id("boards"),
    title: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.boardId, {
      title: args.title,
      description: args.description,
      updatedAt: Date.now(),
    });
  },
});

export const deleteBoard = mutation({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.boardId);
  },
});
```

### React Hooks Usage

**Import Pattern:**
```typescript
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
```

**useQuery Hook:**
```typescript
// Returns undefined while loading, then data
const user = useQuery(api.users.getUserByEmail, { email: "user@example.com" });

// Conditional loading (skip query if condition not met)
const board = useQuery(
  api.boards.getBoard,
  boardId ? { boardId } : "skip"
);

// Handle loading state
if (user === undefined) {
  return <Loading />;
}
```

**useMutation Hook:**
```typescript
const createBoard = useMutation(api.boards.createBoard);

// Fire and forget (most common)
const handleCreate = () => {
  createBoard({
    title: "New Board",
    userId,
    organizationId,
  });
};

// Use result when completed
const handleCreateAndNavigate = async () => {
  const newBoard = await createBoard({
    title: "New Board",
    userId,
    organizationId,
  });
  navigate(`/boards/${newBoard._id}`);
};

// Error handling
const handleCreateWithError = async () => {
  try {
    await createBoard({ title: "New Board", userId, organizationId });
  } catch (error) {
    console.error("Failed to create board:", error);
    showErrorToast(error.message);
  }
};
```

### File Storage

**Generate Upload URL:**
```typescript
// convex/users.ts
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
```

**Upload File from Client:**
```typescript
const generateUploadUrl = useMutation(api.users.generateUploadUrl);
const updateUserAvatar = useMutation(api.users.updateUserAvatar);

const handleFileUpload = async (file: File) => {
  // Get upload URL
  const uploadUrl = await generateUploadUrl();

  // Upload file
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  });
  const { storageId } = await response.json();

  // Save reference in database
  await updateUserAvatar({ userId, avatarId: storageId });
};
```

**Retrieve File URL:**
```typescript
// In query/mutation handler
const avatarUrl = await ctx.storage.getUrl(user.avatar);
```

### Common Patterns

**Relationships (Many-to-Many):**
```typescript
// Schema
memberships: defineTable({
  userId: v.id("users"),
  organizationId: v.id("organizations"),
  role: v.string(),
  createdAt: v.number(),
}),

// Query with relationship
export const getUserOrganizations = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("memberships")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    const organizations = await Promise.all(
      memberships.map(async (m) => await ctx.db.get(m.organizationId))
    );

    return organizations;
  },
});
```

**Timestamps:**
```typescript
// Always use Date.now() for consistency
createdAt: Date.now(),
updatedAt: Date.now(),
```

**Soft Deletes:**
```typescript
// Add to schema
deletedAt: v.optional(v.number()),

// Mutation
export const softDelete = mutation({
  args: { boardId: v.id("boards") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.boardId, {
      deletedAt: Date.now(),
    });
  },
});

// Query (exclude deleted)
const activeBoards = await ctx.db
  .query("boards")
  .filter((q) => q.eq(q.field("deletedAt"), undefined))
  .collect();
```

### Best Practices Summary

**DO:**
- ✅ Validate all function arguments with `v` validators
- ✅ Use TypeScript types from `_generated/dataModel`
- ✅ Return meaningful data from mutations
- ✅ Handle `undefined` loading states in components
- ✅ Use consistent timestamp format (`Date.now()`)
- ✅ Store file references as `v.id("_storage")`
- ✅ Generate URLs for files in queries, not in schema

**DON'T:**
- ❌ Make third-party API calls in queries/mutations (use Actions)
- ❌ Make queries/mutations non-deterministic
- ❌ Store full file URLs in database (use storage IDs)
- ❌ Forget to handle loading states (`undefined`)
- ❌ Use `v.any()` without good reason
- ❌ Perform heavy computation in queries (use Actions)

### Convex Environments

This project has **two Convex environments**:

| Environment | URL | Deployment Name |
|-------------|-----|-----------------|
| **Dev** | https://useful-toucan-91.convex.cloud | `dev:useful-toucan-91` |
| **Production** | https://gallant-viper-145.convex.cloud | `gallant-viper-145` |

The `.env.local` file contains:
```
CONVEX_DEPLOYMENT=dev:useful-toucan-91
VITE_CONVEX_URL=https://useful-toucan-91.convex.cloud
```

---

### Development Commands

| Command | Target Environment |
|---------|-------------------|
| `npx convex dev` | Dev (with watch mode) |
| `npx convex dev --once` | Dev (one-time push) |
| `npx convex deploy` | Production |
| `npx convex dashboard` | Opens dev dashboard |
| `npx convex codegen` | Generates types |

---

### Running Functions Against Specific Environments

| Command | Target Environment |
|---------|-------------------|
| `npx convex run <function>` | Production (default) |
| `CONVEX_DEPLOYMENT=dev:useful-toucan-91 npx convex run <function>` | Dev |

---

### Typical Convex Workflow

1. **Develop & Test**: Use `npx convex dev --once` to push changes to dev
2. **Test Functions**: Use `CONVEX_DEPLOYMENT=dev:useful-toucan-91 npx convex run <fn>` to test
3. **Deploy to Prod**: Use `npx convex deploy --yes` when ready for production
4. **Run in Prod**: Use `npx convex run <fn>` to run functions in production

**Important Notes:**
- `npx convex deploy` always deploys to **production** (`gallant-viper-145`)
- `npx convex dev` deploys to **dev** (`useful-toucan-91`)
- `npx convex run` runs against **production** by default
- New functions/changes may not appear immediately after deploy - use `npx convex dev --once` to push to dev first for testing

## Browser Compatibility Guidelines

### Avoid Deprecated APIs

When detecting browser/OS features, avoid deprecated APIs:

**❌ Deprecated:**
```typescript
// navigator.platform is deprecated
/Mac|iPod|iPhone|iPad/.test(navigator.platform)
```

**✅ Preferred:**
```typescript
// Use navigator.userAgent instead
/Mac|iPod|iPhone|iPad/.test(navigator.userAgent)
```

**Future-proof approach:**
```typescript
// Check for modern API availability first, fallback gracefully
const isMacOS = () => {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
};
```

## UI/UX Best Practices

Concise rules for building accessible, fast, delightful UIs. Use MUST/SHOULD/NEVER to guide decisions.

### Interactions

- **Keyboard**
  - MUST: Full keyboard support per [WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/patterns/)
  - MUST: Visible focus rings (`:focus-visible`; group with `:focus-within`)
  - MUST: Manage focus (trap, move, and return) per APG patterns
- **Targets & input**
  - MUST: Hit target ≥24px (mobile ≥44px). If visual <24px, expand hit area
  - MUST: Mobile `<input>` font-size ≥16px or set:
    ```html
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover">
    ```
  - NEVER: Disable browser zoom
  - MUST: `touch-action: manipulation` to prevent double-tap zoom; set `-webkit-tap-highlight-color` to match design
- **Inputs & forms (behavior)**
  - MUST: Hydration-safe inputs (no lost focus/value)
  - NEVER: Block paste in `<input>/<textarea>`
  - MUST: Loading buttons show spinner and keep original label
  - MUST: Enter submits focused text input. In `<textarea>`, ⌘/Ctrl+Enter submits; Enter adds newline
  - MUST: Keep submit enabled until request starts; then disable, show spinner, use idempotency key
  - MUST: Don't block typing; accept free text and validate after
  - MUST: Allow submitting incomplete forms to surface validation
  - MUST: Errors inline next to fields; on submit, focus first error
  - MUST: `autocomplete` + meaningful `name`; correct `type` and `inputmode`
  - SHOULD: Disable spellcheck for emails/codes/usernames
  - SHOULD: Placeholders end with ellipsis and show example pattern (eg, `+1 (123) 456-7890`, `sk-012345…`)
  - MUST: Warn on unsaved changes before navigation
  - MUST: Compatible with password managers & 2FA; allow pasting one-time codes
  - MUST: Trim values to handle text expansion trailing spaces
  - MUST: No dead zones on checkboxes/radios; label+control share one generous hit target
- **State & navigation**
  - MUST: URL reflects state (deep-link filters/tabs/pagination/expanded panels). Prefer libs like [nuqs](https://nuqs.dev)
  - MUST: Back/Forward restores scroll
  - MUST: Links are links—use `<a>/<Link>` for navigation (support Cmd/Ctrl/middle-click)
- **Feedback**
  - SHOULD: Optimistic UI; reconcile on response; on failure show error and rollback or offer Undo
  - MUST: Confirm destructive actions or provide Undo window
  - MUST: Use polite `aria-live` for toasts/inline validation
  - SHOULD: Ellipsis (`…`) for options that open follow-ups (eg, "Rename…") and loading states (eg, "Loading…", "Saving…", "Generating…")
- **Touch/drag/scroll**
  - MUST: Design forgiving interactions (generous targets, clear affordances; avoid finickiness)
  - MUST: Delay first tooltip in a group; subsequent peers no delay
  - MUST: Intentional `overscroll-behavior: contain` in modals/drawers
  - MUST: During drag, disable text selection and set `inert` on dragged element/containers
  - MUST: No "dead-looking" interactive zones—if it looks clickable, it is
- **Autofocus**
  - SHOULD: Autofocus on desktop when there's a single primary input; rarely on mobile (to avoid layout shift)

### Animation

- MUST: Honor `prefers-reduced-motion` (provide reduced variant)
- SHOULD: Prefer CSS > Web Animations API > JS libraries
- MUST: Animate compositor-friendly props (`transform`, `opacity`); avoid layout/repaint props (`top/left/width/height`)
- SHOULD: Animate only to clarify cause/effect or add deliberate delight
- SHOULD: Choose easing to match the change (size/distance/trigger)
- MUST: Animations are interruptible and input-driven (avoid autoplay)
- MUST: Correct `transform-origin` (motion starts where it "physically" should)

### Layout

- SHOULD: Optical alignment; adjust by ±1px when perception beats geometry
- MUST: Deliberate alignment to grid/baseline/edges/optical centers—no accidental placement
- SHOULD: Balance icon/text lockups (stroke/weight/size/spacing/color)
- MUST: Verify mobile, laptop, ultra-wide (simulate ultra-wide at 50% zoom)
- MUST: Respect safe areas (use `env(safe-area-inset-*)`)
- MUST: Avoid unwanted scrollbars; fix overflows

### Content & Accessibility

- SHOULD: Inline help first; tooltips last resort
- MUST: Skeletons mirror final content to avoid layout shift
- MUST: `<title>` matches current context
- MUST: No dead ends; always offer next step/recovery
- MUST: Design empty/sparse/dense/error states
- SHOULD: Curly quotes (" "); avoid widows/orphans
- MUST: Tabular numbers for comparisons (`font-variant-numeric: tabular-nums` or a mono like Geist Mono)
- MUST: Redundant status cues (not color-only); icons have text labels
- MUST: Don't ship the schema—visuals may omit labels but accessible names still exist
- MUST: Use the ellipsis character `…` (not `...`)
- MUST: `scroll-margin-top` on headings for anchored links; include a "Skip to content" link; hierarchical `<h1–h6>`
- MUST: Resilient to user-generated content (short/avg/very long)
- MUST: Locale-aware dates/times/numbers/currency
- MUST: Accurate names (`aria-label`), decorative elements `aria-hidden`, verify in the Accessibility Tree
- MUST: Icon-only buttons have descriptive `aria-label`
- MUST: Prefer native semantics (`button`, `a`, `label`, `table`) before ARIA
- SHOULD: Right-clicking the nav logo surfaces brand assets
- MUST: Use non-breaking spaces to glue terms: `10&nbsp;MB`, `⌘&nbsp;+&nbsp;K`, `Vercel&nbsp;SDK`

### Performance

- SHOULD: Test iOS Low Power Mode and macOS Safari
- MUST: Measure reliably (disable extensions that skew runtime)
- MUST: Track and minimize re-renders (React DevTools/React Scan)
- MUST: Profile with CPU/network throttling
- MUST: Batch layout reads/writes; avoid unnecessary reflows/repaints
- MUST: Mutations (`POST/PATCH/DELETE`) target <500 ms
- SHOULD: Prefer uncontrolled inputs; make controlled loops cheap (keystroke cost)
- MUST: Virtualize large lists (eg, `virtua`)
- MUST: Preload only above-the-fold images; lazy-load the rest
- MUST: Prevent CLS from images (explicit dimensions or reserved space)

### Design

- SHOULD: Layered shadows (ambient + direct)
- SHOULD: Crisp edges via semi-transparent borders + shadows
- SHOULD: Nested radii: child ≤ parent; concentric
- SHOULD: Hue consistency: tint borders/shadows/text toward bg hue
- MUST: Accessible charts (color-blind-friendly palettes)
- MUST: Meet contrast—prefer [APCA](https://apcacontrast.com/) over WCAG 2
- MUST: Increase contrast on `:hover/:active/:focus`
- SHOULD: Match browser UI to bg
- SHOULD: Avoid gradient banding (use masks when needed)

## Production Deployment Workflow

### Publishing to Production

**IMPORTANT:** When the user says "push to production" or "publish", follow this exact workflow:

1. **Run database migrations on Convex production:**
   ```bash
   # Check for migration scripts in package.json or convex/migrations/
   # Run appropriate migration commands if they exist
   ```

2. **Deploy Convex backend to production:**
   ```bash
   npx convex deploy --yes
   ```

3. **Commit and push to GitHub:**
   ```bash
   git add .
   git commit -m "[Descriptive commit message]

   🤖 Generated with [Claude Code](https://claude.com/claude-code)

   Co-Authored-By: Claude <noreply@anthropic.com>"
   git push origin main
   ```

**Note:** Vercel is configured to automatically deploy the frontend when changes are pushed to GitHub. No manual frontend deployment step is needed.

## Development Best Practices

### Reuse Existing Logic

Before implementing new calculations or detection logic, **check if the value is already computed elsewhere**:

- **Parameters**: Check if render functions already receive the value you need (e.g., `isLastRow` in DataTable)
- **Context**: Check if React context already provides the state
- **Computed values**: Check if TanStack Table, form libraries, etc. already expose derived state

**Example of bug avoided:**
```typescript
// ❌ Bad: Recalculating from data array (doesn't account for sorting)
const isLastChildInGroup = parentRow?.subRows?.[parentRow.subRows.length - 1]?.id === row.id

// ✅ Good: Use the existing parameter that's already correctly calculated
const shouldRemoveBottomBorder = isChildRow && isFirstColumn && !isLastRow
```

### Server-Side vs Client-Side Alignment

When implementing pagination, sorting, or filtering:

1. **Backend sorting must match UI display** - If UI shows `contract.updatedAt`, backend must sort by `contract.updatedAt`, not `fixture.updatedAt`
2. **Test across page boundaries** - Verify that page 2 doesn't contain items that should appear before page 1 items
3. **Denormalize carefully** - When storing computed fields, ensure the calculation matches what the UI displays

**Verification checklist:**
- Sort ascending, check page 1 → page 2 transition
- Sort descending, check page 1 → page 2 transition
- Filter + sort combination

### TypeScript Strictness

Avoid `any` types. Use proper typing:

```typescript
// ❌ Avoid
cell: ({ row }: any) => { ... }

// ✅ Prefer
import type { CellContext, Row } from "@tanstack/react-table";
type FixtureCellContext<TValue = unknown> = CellContext<FixtureData, TValue>;

cell: ({ row }: FixtureCellContext<string>) => { ... }
```

**Patterns for strict typing:**
- Create type aliases for frequently used generics
- Use discriminated unions for variant types
- Create type guards for runtime narrowing
- Use `unknown` instead of `any`, then narrow with type guards

### Understanding Library Internals

When working with Radix UI, TanStack Table, or other libraries:

1. **Read the source** - Understand how events propagate (e.g., Radix's DismissableLayer)
2. **Check existing props** - Libraries often have props for edge cases (e.g., `onPointerDownOutside`)
3. **Test race conditions** - Especially with click handlers and open/close state

**Common patterns:**
- `e.preventDefault()` to stop library default behavior
- `modal={false}` for non-blocking overlays
- Event handler order matters (props spread order)

### Falsy Value Handling

When displaying numeric values, **never use truthiness checks** — `0` is falsy and will be treated as missing:

```typescript
// ❌ Bad: 0 displays as "–"
const display = value ? value : "–"
const display = value || "–"

// ✅ Good: 0 displays as "0"
const display = value != null ? value : "–"
```

Apply this to: quantities, rates, percentages, commissions — any field where `0` is a valid value.

### Flex Overflow Pattern

When using `overflow-auto` or `overflow-hidden` on a flex child, **always add `min-w-0` (or `min-h-0` for vertical)**. Without it, flex items won't shrink below their content size:

```typescript
// ❌ Bad: Content overflows, scroll doesn't work
<div className="flex">
  <div className="flex-1 overflow-x-auto">
    {/* Content wider than container won't scroll */}
  </div>
</div>

// ✅ Good: Content scrolls properly
<div className="flex">
  <div className="flex-1 min-w-0 overflow-x-auto">
    {/* Content scrolls as expected */}
  </div>
</div>
```

### Date & Number Formatting

Always use shared formatting helpers, never browser APIs directly:

```typescript
// ❌ Bad: Browser-dependent output
date.toLocaleDateString()
value.toFixed(2)

// ✅ Good: Consistent output via shared helpers
formatTimestamp(date)
formatCurrency(value)
```

Check `src/utils/` for existing formatters before creating new ones.

### Deep Equality Comparisons

Never use `JSON.stringify()` for equality checks — it's key-order sensitive:

```typescript
// ❌ Bad: {a:1, b:2} !== {b:2, a:1} as strings
const isDirty = JSON.stringify(current) !== JSON.stringify(saved)

// ✅ Good: Proper structural comparison
const isDirty = !deepEqual(current, saved)
```

### CSS Box Model with JavaScript APIs

When using `ResizeObserver`, `offsetWidth`, or `getBoundingClientRect()`:

- **`offsetWidth`** = content + padding + border (NOT margin)
- **`getBoundingClientRect().width`** = content + padding + border (NOT margin)

If you need accurate container sizing for JS calculations, use **padding** instead of **margin** for spacing. Margins are invisible to dimension APIs.

## Verification with Chrome MCP

### Always Verify UI Changes

After implementing UI fixes or features, **use Chrome MCP tools to verify the changes in the browser**:

**Verification Workflow:**

1. **Take a snapshot** to inspect the current page structure:
   ```
   mcp__chrome-devtools__take_snapshot
   ```

2. **Take a screenshot** to visually verify the implementation:
   ```
   mcp__chrome-devtools__take_screenshot
   ```

3. **Navigate to the relevant page** if needed:
   ```
   mcp__chrome-devtools__navigate_page (url: "http://localhost:5173/fixtures")
   ```

4. **Interact with elements** to test behavior:
   ```
   mcp__chrome-devtools__click (uid: "element-uid")
   ```

### When to Verify

- **Bug fixes**: After fixing visual bugs (borders, spacing, colors), verify the fix renders correctly
- **Figma implementations**: When implementing designs from Figma, compare the browser output against the Figma design
- **Interactive features**: Test click handlers, form submissions, and state changes
- **Responsive layouts**: Resize the page and verify at different viewports

### Figma Design Verification

When implementing a Figma design:

1. **Get the design context** from Figma:
   ```
   mcp__plugin_figma_figma-desktop__get_design_context (nodeId: "123:456")
   ```

2. **Implement the design** in code

3. **Verify in browser** using Chrome MCP:
   - Take a screenshot of the implemented component
   - Compare against the Figma screenshot
   - Check spacing, colors, typography, and alignment match the design

### Example Verification Session

```typescript
// After fixing a DataTable border issue:
// 1. Navigate to the Fixtures page
// 2. Expand a fixture row to show child rows
// 3. Take a screenshot to verify borders render correctly
// 4. Confirm non-last child rows have no bottom border
// 5. Confirm the last child row keeps its bottom border
```

---

*Last updated: 2026-02-10*