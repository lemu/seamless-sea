# Sidebar Migration Guide: CSS Overrides to Remove

This guide documents the sidebar improvements made to the Tide UI library and the CSS overrides you can now safely remove from your AppFrame implementation.

## 🎯 Overview

The Tide UI Sidebar component has been enhanced with comprehensive hover effects, proper active states, responsive padding, and improved alignment. Many CSS overrides that were previously required in consuming applications can now be removed.

## ✅ Fixed Issues

### 1. **Hover Effects & Active States**
- **Issue**: Hover effects were barely visible (5% alpha transparency)
- **Fix**: Updated `--color-background-neutral-subtle-hovered` from `--grey-alpha-25` to `--grey-alpha-50` for better visibility
- **Issue**: Active menu items had wrong hover colors
- **Fix**: Added proper CSS specificity with `!important` selectors for brand-selected-hovered colors

### 2. **Typography & Cursor**
- **Issue**: Submenu items used inconsistent font sizes
- **Fix**: Updated to use semantic typography tokens (`text-body-sm`, `text-body-md`)
- **Issue**: Missing cursor pointer on submenu items
- **Fix**: Added `cursor-pointer` to submenu button styling

### 3. **Responsive Padding & Alignment**
- **Issue**: Inconsistent padding in collapsed state
- **Fix**: Added responsive padding classes to `SidebarGroup`, `SidebarHeader`, and `SidebarFooter`
- **Issue**: Team/user selectors misaligned in collapsed state
- **Fix**: Standardized button sizing and added proper centering

### 4. **Component Enhancements**
- **New**: `SidebarSearchButton` and `SidebarSearchTrigger` components with built-in keyboard shortcuts
- **Enhanced**: `SidebarMenuAction` sizing improved from `w-5` to `w-6`

## 🗑️ CSS Overrides You Can Now Remove

Based on the AppFrame implementation you provided, you can safely remove these CSS overrides:

### 1. **Hover Effects** ❌ Remove
```css
/* Remove: Hover effects are now built-in */
.sidebar [data-sidebar="menu-button"]:hover {
  background-color: var(--color-background-neutral-subtle-hovered) !important;
  color: var(--color-text-primary) !important;
}
```

### 2. **Active State Hover Colors** ❌ Remove
```css
/* Remove: Active hover colors now use proper brand colors */
.sidebar [data-sidebar="menu-button"][data-active="true"]:hover {
  background-color: var(--color-background-brand-selected-hovered) !important;
  color: var(--color-text-brand-hovered) !important;
}
```

### 3. **Submenu Button Styling** ❌ Remove
```css
/* Remove: Submenu styling is now consistent */
.sidebar [data-sidebar="menu-sub-button"] {
  font-size: var(--text-body-sm) !important;
  cursor: pointer !important;
}
```

### 4. **Responsive Padding Overrides** ❌ Remove
```css
/* Remove: Responsive padding is now built-in */
.sidebar [data-sidebar="group"] {
  padding: var(--space-md) !important;
}

@media (max-width: 768px) {
  .sidebar[data-collapsible="icon"] [data-sidebar="group"] {
    padding: var(--space-sm) !important;
  }
}

.sidebar [data-sidebar="header"],
.sidebar [data-sidebar="footer"] {
  padding: var(--space-md) !important;
}

@media (max-width: 768px) {
  .sidebar[data-collapsible="icon"] [data-sidebar="header"],
  .sidebar[data-collapsible="icon"] [data-sidebar="footer"] {
    padding: var(--space-sm) !important;
  }
}
```

### 5. **Team/User Selector Alignment** ❌ Remove
```css
/* Remove: Button alignment is now standardized */
.sidebar [data-sidebar="menu-button"][data-size="lg"] {
  height: 3rem !important;
  padding: 0.75rem !important;
}

.sidebar[data-collapsible="icon"] [data-sidebar="menu-button"] {
  width: 2rem !important;
  height: 2rem !important;
  padding: 0.5rem !important;
  justify-content: center !important;
}
```

## ✨ New Features You Can Use

### 1. **Built-in Search Components**
Replace custom search implementations with:
```tsx
// New built-in search with keyboard shortcuts
<SidebarSearchButton />
<SidebarSearchTrigger placeholder="Search..." />
```

### 2. **Improved Menu Actions**
Enhanced spacing and sizing for menu actions:
```tsx
<SidebarMenuAction>
  <Icon name="more-horizontal" />
</SidebarMenuAction>
```

### 3. **Consistent Typography**
Use semantic tokens throughout:
```tsx
// Submenu items automatically use proper typography
<SidebarMenuSubButton size="sm">New Order</SidebarMenuSubButton>
<SidebarMenuSubButton size="md">Mailing List</SidebarMenuSubButton>
```

## 🔄 Migration Steps

### Step 1: Update Tide UI Library
Ensure you're using the latest version with the sidebar fixes:
```bash
npm update @rafal.lemieszewski/tide-ui
```

### Step 2: Remove CSS Overrides
Remove all the CSS overrides listed in the "CSS Overrides You Can Now Remove" section from your AppFrame styles.

### Step 3: Test Hover Effects
Verify that hover effects work properly without custom CSS:
- Menu item hover states
- Active menu item hover colors
- Submenu item interactions
- Collapsed sidebar alignment

### Step 4: Update Search Implementation (Optional)
Consider replacing custom search with built-in components:
```tsx
// Before: Custom search
<div className="custom-search">...</div>

// After: Built-in search
<SidebarSearchTrigger placeholder="Search..." />
```

### Step 5: Verify Responsive Behavior
Test the sidebar in both expanded and collapsed states to ensure:
- Proper padding in both states
- Correct button alignment
- Team/user selector positioning

## 🚨 Compatibility Notes

### Backward Compatibility
- All existing Sidebar implementations continue to work
- No breaking changes to component APIs
- CSS overrides will still work if you need custom styling

### Visual Changes
- Hover effects are now more visible (10% vs 5% alpha)
- Active state hover colors use proper brand colors
- Typography is more consistent across submenu items

## 🎨 Design Token Changes

### Updated CSS Variables
```css
/* Improved hover visibility */
--color-background-neutral-subtle-hovered: var(--grey-alpha-50); /* was --grey-alpha-25 */

/* Added missing destructive colors */
--color-text-destructive: var(--red-500);
--color-background-destructive-subtle: var(--red-50);
```

## 📚 Related Components

The following components were enhanced as part of this update:
- `Sidebar` - Main container with responsive behavior
- `SidebarGroup` - Responsive padding improvements
- `SidebarHeader` - Responsive padding improvements
- `SidebarFooter` - Responsive padding improvements
- `SidebarMenuButton` - Enhanced hover and active states
- `SidebarMenuSubButton` - Typography and cursor improvements
- `SidebarMenuAction` - Improved sizing
- `SidebarSearchButton` - New component
- `SidebarSearchTrigger` - New component

## 🔍 Testing Checklist

After removing the CSS overrides, verify:
- [ ] Menu items show hover effects on desktop
- [ ] Active menu items display correct brand colors on hover
- [ ] Submenu items have proper font sizes and cursor pointer
- [ ] Collapsed sidebar has correct padding and alignment
- [ ] Team/user selectors are properly centered in collapsed state
- [ ] No visual regressions in your AppFrame implementation
- [ ] Both desktop and mobile responsive behaviors work correctly

## 💡 Need Help?

If you encounter any issues after removing the CSS overrides:
1. Check that you're using the latest Tide UI version
2. Verify no conflicting CSS remains in your application
3. Test in both expanded and collapsed sidebar states
4. Refer to the AppFrame story in Storybook for reference implementation

The goal is to eliminate the need for CSS overrides while maintaining the same visual appearance and behavior in your application.