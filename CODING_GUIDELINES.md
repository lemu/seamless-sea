# Coding Guidelines - Based on Vercel Design Principles

## Overview
These coding guidelines are derived from [Vercel's Web Interface Guidelines](https://vercel.com/design/guidelines) and adapted for our React/TypeScript application development.

## 1. Accessibility First

### Focus Management
```tsx
// ✅ Good: Clear focus states
const Button = styled.button`
  &:focus-visible {
    outline: 2px solid var(--color-border-brand);
    outline-offset: 2px;
  }
`;

// ✅ Good: Focus trap management
import { useFocusTrap } from 'focus-trap-react';
const Modal = ({ isOpen, children }) => {
  const focusTrapRef = useFocusTrap();
  return isOpen ? <div ref={focusTrapRef}>{children}</div> : null;
};
```

### Accessible Labels
```tsx
// ✅ Good: Accessible button names
<Button aria-label="Close dialog">
  <Icon name="x" />
</Button>

// ✅ Good: Form labels
<FormField>
  <FormLabel htmlFor="email">Email Address</FormLabel>
  <Input id="email" type="email" required />
</FormField>

// ❌ Bad: Missing accessible names
<Button><Icon name="x" /></Button>
```

### Keyboard Navigation
```tsx
// ✅ Good: Full keyboard support
const Dropdown = () => {
  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        toggleOpen();
        break;
      case 'Escape':
        close();
        break;
      case 'ArrowDown':
        focusNextItem();
        break;
    }
  };

  return (
    <DropdownMenuTrigger onKeyDown={handleKeyDown}>
      {/* content */}
    </DropdownMenuTrigger>
  );
};
```

## 2. User Experience Patterns

### Hit Target Sizes
```tsx
// ✅ Good: Minimum 44px hit targets
const IconButton = styled.button`
  min-width: 44px;
  min-height: 44px;
  padding: 12px;

  @media (max-width: 768px) {
    min-width: 48px;
    min-height: 48px;
  }
`;

// ✅ Good: Expand interactive areas
const Card = () => (
  <div className="relative">
    <h3>Card Title</h3>
    <p>Card content</p>
    <Link
      href="/details"
      className="absolute inset-0 z-10"
      aria-label="View card details"
    >
      <span className="sr-only">View details</span>
    </Link>
  </div>
);
```

### Mobile Input Optimization
```tsx
// ✅ Good: Prevent auto-zoom on mobile
<Input
  type="email"
  style={{ fontSize: '16px' }} // Prevents zoom on iOS
  autoComplete="email"
/>

// ✅ Good: Appropriate input types
<Input type="tel" pattern="[0-9]*" /> // Numeric keyboard on mobile
<Input type="email" /> // Email keyboard
<Input type="url" /> // URL keyboard
```

### Optimistic UI Updates
```tsx
// ✅ Good: Optimistic updates with rollback
const useOptimisticUpdate = (mutationFn: Function) => {
  const [optimisticState, setOptimisticState] = useState();

  const mutate = async (newData: any) => {
    const previousState = optimisticState;
    setOptimisticState(newData); // Immediate UI update

    try {
      await mutationFn(newData);
    } catch (error) {
      setOptimisticState(previousState); // Rollback on error
      throw error;
    }
  };

  return { mutate, data: optimisticState };
};
```

### Destructive Action Confirmation
```tsx
// ✅ Good: Confirm destructive actions
const DeleteButton = ({ onDelete, itemName }) => {
  const handleDelete = () => {
    const confirmed = confirm(
      `Are you sure you want to delete "${itemName}"? This action cannot be undone.`
    );
    if (confirmed) {
      onDelete();
    }
  };

  return (
    <Button
      variant="destructive"
      onClick={handleDelete}
      aria-describedby="delete-warning"
    >
      Delete
      <span id="delete-warning" className="sr-only">
        This action is permanent and cannot be undone
      </span>
    </Button>
  );
};
```

## 3. Navigation and State Management

### URL State Persistence
```tsx
// ✅ Good: Shareable URLs with state
const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const filter = searchParams.get('filter') || 'all';

  const updateSearch = (newQuery: string) => {
    setSearchParams(prev => {
      prev.set('q', newQuery);
      return prev;
    });
  };

  return (
    <div>
      <SearchInput value={query} onChange={updateSearch} />
      <FilterTabs selected={filter} />
    </div>
  );
};
```

### Proper Link Usage
```tsx
// ✅ Good: Use Link for navigation
import { Link } from 'react-router';

const Navigation = () => (
  <nav>
    <Link to="/dashboard">Dashboard</Link>
    <Link to="/settings">Settings</Link>
  </nav>
);

// ❌ Bad: Using buttons for navigation
<button onClick={() => navigate('/dashboard')}>Dashboard</button>
```

## 4. Animation and Motion

### Respect User Preferences
```tsx
// ✅ Good: Honor prefers-reduced-motion
const AnimatedCard = styled.div`
  transition: transform 0.2s ease-out;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  &:hover {
    transform: translateY(-2px);
  }
`;

// ✅ Good: CSS custom properties for animations
const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
};
```

### GPU-Accelerated Animations
```tsx
// ✅ Good: Use transform and opacity for performance
const SlideIn = styled.div`
  transform: translateX(-100%);
  opacity: 0;
  transition: transform 0.3s ease-out, opacity 0.3s ease-out;
  will-change: transform, opacity;

  &.enter {
    transform: translateX(0);
    opacity: 1;
  }
`;

// ❌ Bad: Animating layout properties
const BadAnimation = styled.div`
  left: -100px; /* Forces layout recalculation */
  transition: left 0.3s ease-out;
`;
```

## 5. Layout and Responsive Design

### Optical Alignment
```tsx
// ✅ Good: Visual alignment over mathematical alignment
const PlayButton = styled.button`
  padding: 12px 16px 12px 14px; /* Slightly less left padding for optical centering */

  svg {
    margin-left: 2px; /* Nudge play icon for optical center */
  }
`;

// ✅ Good: Account for font metrics
const Heading = styled.h1`
  margin-top: -0.1em; /* Compensate for font's built-in spacing */
  line-height: 1.2;
`;
```

### Responsive Coverage
```tsx
// ✅ Good: Mobile-first responsive design
const Container = styled.div`
  padding: 16px;

  @media (min-width: 768px) {
    padding: 24px;
  }

  @media (min-width: 1024px) {
    padding: 32px;
  }
`;

// ✅ Good: Safe area support
const MobileHeader = styled.header`
  padding-top: max(16px, env(safe-area-inset-top));
  padding-left: max(16px, env(safe-area-inset-left));
  padding-right: max(16px, env(safe-area-inset-right));
`;
```

### Flexible Layout Systems
```tsx
// ✅ Good: Let browser handle sizing
const FlexLayout = styled.div`
  display: flex;
  gap: 16px;

  > * {
    flex: 1; /* Equal distribution */
  }

  > .priority {
    flex: 2; /* Double space for priority items */
  }
`;

// ✅ Good: CSS Grid for complex layouts
const GridLayout = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
`;
```

## 6. Performance Optimization

### Minimize Layout Work
```tsx
// ✅ Good: Use CSS containment
const ListItem = styled.li`
  contain: layout style paint;
`;

// ✅ Good: Batch DOM updates
const useBatchedUpdates = () => {
  const [updates, setUpdates] = useState([]);

  const flushUpdates = useCallback(() => {
    if (updates.length > 0) {
      // Process all updates at once
      requestAnimationFrame(() => {
        updates.forEach(update => update());
        setUpdates([]);
      });
    }
  }, [updates]);

  return { addUpdate: (fn) => setUpdates(prev => [...prev, fn]), flushUpdates };
};
```

### Virtual Lists for Large Data
```tsx
// ✅ Good: Virtualize large lists
import { FixedSizeList as List } from 'react-window';

const VirtualizedList = ({ items }) => {
  const Row = ({ index, style }) => (
    <div style={style}>
      <ListItem data={items[index]} />
    </div>
  );

  return (
    <List
      height={600}
      itemCount={items.length}
      itemSize={80}
      width="100%"
    >
      {Row}
    </List>
  );
};
```

### Image Optimization
```tsx
// ✅ Good: Prevent layout shift with dimensions
const OptimizedImage = ({ src, alt, width, height }) => (
  <img
    src={src}
    alt={alt}
    width={width}
    height={height}
    style={{
      width: '100%',
      height: 'auto',
      aspectRatio: `${width} / ${height}`
    }}
    loading="lazy"
    decoding="async"
  />
);
```

## 7. Content and State Handling

### Comprehensive State Coverage
```tsx
// ✅ Good: Handle all content states
const DataTable = ({ data, loading, error }) => {
  if (loading) {
    return <TableSkeleton />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load data"
        message="Please try again or contact support if the problem persists."
        onRetry={() => refetch()}
      />
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        title="No data found"
        message="Get started by adding your first item."
        action={<Button onClick={openCreateModal}>Add Item</Button>}
      />
    );
  }

  return <Table data={data} />;
};
```

### Semantic HTML First
```tsx
// ✅ Good: Semantic structure
const BlogPost = () => (
  <article>
    <header>
      <h1>Post Title</h1>
      <time dateTime="2024-01-15">January 15, 2024</time>
    </header>
    <main>
      <p>Post content...</p>
    </main>
    <footer>
      <address>By <a href="/author">Author Name</a></address>
    </footer>
  </article>
);

// ✅ Good: Proper heading hierarchy
const PageStructure = () => (
  <div>
    <h1>Page Title</h1>
    <section>
      <h2>Section Title</h2>
      <h3>Subsection</h3>
    </section>
  </div>
);
```

### Locale-Aware Formatting
```tsx
// ✅ Good: Use browser APIs for formatting
const formatters = {
  currency: new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }),
  date: new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }),
  number: new Intl.NumberFormat('en-US')
};

const PriceDisplay = ({ amount }) => (
  <span>{formatters.currency.format(amount)}</span>
);
```

## 8. Component Design Patterns

### Consistent Props Interface
```tsx
// ✅ Good: Consistent prop patterns
interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  'data-testid'?: string;
}

interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
}
```

### Compound Components
```tsx
// ✅ Good: Flexible composition
const Card = ({ children, className }) => (
  <div className={cn("card", className)}>{children}</div>
);

Card.Header = ({ children }) => <header className="card-header">{children}</header>;
Card.Content = ({ children }) => <div className="card-content">{children}</div>;
Card.Footer = ({ children }) => <footer className="card-footer">{children}</footer>;

// Usage
<Card>
  <Card.Header>
    <h3>Title</h3>
  </Card.Header>
  <Card.Content>
    <p>Content</p>
  </Card.Content>
  <Card.Footer>
    <Button>Action</Button>
  </Card.Footer>
</Card>
```

## 9. Development Workflow

### Component Testing
```tsx
// ✅ Good: Test accessibility and user interactions
describe('Button Component', () => {
  it('should be keyboard accessible', async () => {
    render(<Button onClick={mockFn}>Click me</Button>);

    const button = screen.getByRole('button', { name: 'Click me' });

    // Test keyboard interaction
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(mockFn).toHaveBeenCalled();

    // Test focus visibility
    button.focus();
    expect(button).toHaveFocus();
  });

  it('should handle disabled state', () => {
    render(<Button disabled onClick={mockFn}>Disabled</Button>);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockFn).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
  });
});
```

### Performance Monitoring
```tsx
// ✅ Good: Monitor performance metrics
const usePerformanceMonitoring = () => {
  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        console.log(`${entry.name}: ${entry.duration}ms`);
      });
    });

    observer.observe({ entryTypes: ['measure', 'navigation'] });

    return () => observer.disconnect();
  }, []);
};
```

## 10. Code Organization

### Feature-Based Structure
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

### Consistent Naming Conventions
```tsx
// ✅ Good: Clear, descriptive names
const useUserProfile = () => { /* ... */ };
const UserProfileCard = () => { /* ... */ };
const formatUserDisplayName = (user) => { /* ... */ };

// ✅ Good: Event handler naming
const handleSubmit = () => { /* ... */ };
const handleInputChange = () => { /* ... */ };
const handleModalClose = () => { /* ... */ };
```

## Conclusion

These guidelines prioritize:
- **Accessibility** as a fundamental requirement
- **Performance** through thoughtful implementation choices
- **User Experience** with forgiving, predictable interactions
- **Maintainability** through consistent patterns and semantic HTML
- **Scalability** via proper component architecture

Always test implementations across different devices, screen sizes, and accessibility tools to ensure compliance with these principles.

---

*Based on [Vercel Web Interface Guidelines](https://vercel.com/design/guidelines)*
*Last Updated: September 2024*