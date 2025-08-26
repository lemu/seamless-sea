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

## UI Component Guidelines

### Prefer Tide UI Components

When creating UI elements, **always prefer components from `@rafal.lemieszewski/tide-ui`** over custom implementations or other libraries.

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

---

*Last updated: 2025-08-26*