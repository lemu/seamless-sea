# Migration Guide: Updating to @rafal.lemieszewski/tide-ui@0.3.1

## 🚀 Quick Overview
This guide covers the smooth transition to tide-ui 0.3.1, which includes 30 production-ready components with enhanced functionality and better design system integration.

## 📦 Installation & Setup

### 1. Update Package
```bash
npm install @rafal.lemieszewski/tide-ui@0.3.1
```

### 2. Import Styles
Make sure you're importing the CSS file in your main app file:
```tsx
import '@rafal.lemieszewski/tide-ui/styles'
```

## 🆕 New Components Available (NPM Ready)

### **Major New Additions:**
- **FormField** - Complete form field with label, control, helper text, and error handling
- **RadioGroup** - Accessible radio group with variants
- **ToggleGroup** - Toggle group for multiple selections  
- **ScrollArea** - Custom scrollable areas with styled scrollbars
- **Editable** - Inline editing with contenteditable support
- **Sheet** - Slide-out panel component (improved with design system button)

### **Enhanced Existing Components:**
- **Avatar**, **Accordion**, **AlertDialog**, **Badge**, **Breadcrumb**
- **Button**, **Card**, **Checkbox**, **Command**, **Combobox**
- **DropdownMenu**, **Icon**, **Input**, **Kbd**, **Label**
- **Select**, **Separator**, **Sidebar**, **Skeleton**, **Switch**
- **Tabs**, **Textarea**, **TextLink**, **Toggle**, **Tooltip**

## 🔄 Import Changes

### **New Import Patterns:**
```tsx
// Form components
import { 
  FormField, 
  FormLabel, 
  FormControl, 
  FormHelperText, 
  FormErrorMessage 
} from '@rafal.lemieszewski/tide-ui'

// Selection components
import { 
  RadioGroup, 
  RadioGroupItem,
  ToggleGroup, 
  ToggleGroupItem 
} from '@rafal.lemieszewski/tide-ui'

// Layout & Interaction
import { 
  ScrollArea, 
  ScrollBar,
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetTrigger,
  SheetClose
} from '@rafal.lemieszewski/tide-ui'

// Advanced Input
import { 
  Editable, 
  EditablePreview, 
  EditableInput, 
  EditableTextarea,
  useEditable 
} from '@rafal.lemieszewski/tide-ui'
```

## 🎨 Design System Improvements

### **Enhanced FormField Usage:**
```tsx
// Before: Manual form layouts
<div>
  <label htmlFor="email">Email</label>
  <input id="email" type="email" />
  <span>Helper text here</span>
</div>

// After: Integrated FormField component
<FormField>
  <FormLabel htmlFor="email">Email</FormLabel>
  <FormControl>
    <Input id="email" type="email" />
  </FormControl>
  <FormHelperText>We'll never share your email</FormHelperText>
</FormField>
```

### **Checkbox Integration:**
```tsx
<FormField isCheckboxField>
  <div className="flex items-start space-x-2">
    <Checkbox id="terms" className="mt-0.5" />
    <FormLabel htmlFor="terms">
      I agree to the terms and conditions
    </FormLabel>
  </div>
  <FormHelperText>
    Please read our terms carefully.
  </FormHelperText>
</FormField>
```

### **Switch with Helper Text:**
```tsx
<FormField>
  <div className="flex items-start space-x-2">
    <Switch id="notifications" />
    <FormLabel htmlFor="notifications">
      Enable notifications
    </FormLabel>
  </div>
  <FormHelperText className="!ml-11 [&>div]:!flex-none [&>svg]:!hidden [&>span]:!ml-0">
    Receive updates about your account.
  </FormHelperText>
</FormField>
```

## 📱 Component Usage Examples

### **Sheet Component (Enhanced):**
```tsx
<Sheet>
  <SheetTrigger asChild>
    <Button>Open Settings</Button>
  </SheetTrigger>
  <SheetContent>
    <SheetHeader>
      <SheetTitle>Edit Profile</SheetTitle>
    </SheetHeader>
    {/* Content here */}
    {/* Close button is automatically included with proper design system styling */}
  </SheetContent>
</Sheet>
```

### **RadioGroup:**
```tsx
<RadioGroup defaultValue="option1">
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="option1" id="opt1" />
    <Label htmlFor="opt1">Option 1</Label>
  </div>
  <div className="flex items-center space-x-2">
    <RadioGroupItem value="option2" id="opt2" />
    <Label htmlFor="opt2">Option 2</Label>
  </div>
</RadioGroup>
```

### **Editable Text:**
```tsx
<Editable defaultValue="Click to edit" placeholder="Enter text...">
  <EditablePreview className="text-body-md" />
  <EditableInput />
</Editable>
```

### **ScrollArea:**
```tsx
<ScrollArea className="h-48 w-full rounded-md border p-4">
  <div className="space-y-2">
    {items.map((item, i) => (
      <div key={i}>{item}</div>
    ))}
  </div>
</ScrollArea>
```

## ⚡ Performance & Bundle Size

### **Optimizations:**
- **Tree-shakable**: Only import what you use
- **TypeScript**: Full type safety with IntelliSense
- **CSS bundled**: Single CSS import for all components
- **Dual formats**: ESM and CommonJS support

### **Bundle Impact:**
- **Base package**: ~2.7MB (includes all 30 components)
- **Tree-shaking**: Use only components you import
- **CSS**: ~127KB gzipped for complete styling

## 🔧 TypeScript Support

All components now have full TypeScript support:

```tsx
import type { 
  FormFieldProps,
  RadioGroupProps,
  SheetContentProps,
  EditableProps 
} from '@rafal.lemieszewski/tide-ui'

// Full IntelliSense and type checking available
const MyFormField: React.FC<FormFieldProps> = ({ isCheckboxField }) => {
  // TypeScript will provide complete autocomplete
}
```

## 🎯 Migration Checklist

### **Pre-Migration:**
- [ ] Review current component usage
- [ ] Identify forms that could use FormField
- [ ] Check for custom radio/toggle implementations
- [ ] Audit scroll areas and modals

### **During Migration:**
- [ ] Update package to 0.3.1
- [ ] Import CSS file in main app
- [ ] Replace manual form layouts with FormField
- [ ] Update any custom radio groups to use RadioGroup
- [ ] Replace custom modals/sheets with Sheet component
- [ ] Test all form interactions and accessibility

### **Post-Migration:**
- [ ] Verify TypeScript integration
- [ ] Test responsive behavior
- [ ] Check accessibility with screen readers
- [ ] Validate design system consistency

## 🚨 Breaking Changes (Minimal)

### **Sheet Component:**
- Close button now uses design system Button component
- Better accessibility and consistent styling
- **Migration**: No code changes needed - just better UX

### **FormField Improvements:**
- Better alignment for checkboxes and switches
- Enhanced helper text positioning
- **Migration**: Existing FormField usage remains compatible

## 🎨 Design Token Usage

All components follow the design system patterns:

```tsx
// Use semantic design tokens consistently
<Button className="bg-[var(--color-background-brand)] text-[var(--color-text-on-action)]">
  Submit
</Button>

// Typography utilities
<div className="text-heading-lg text-body-md text-label-sm">
  Semantic typography
</div>

// Spacing and sizing
<div className="p-[var(--space-lg)] m-[var(--space-md)] w-[var(--size-xlg)]">
  Design system spacing
</div>
```

## 📚 Resources

- **NPM Package**: `@rafal.lemieszewski/tide-ui@0.3.1`
- **Storybook**: Check NPM section for all available components
- **Repository**: All components are documented with examples
- **TypeScript**: Full type definitions included

## 🤝 Support

If you encounter any issues during migration:
1. Check component examples in Storybook NPM section
2. Verify TypeScript types are imported correctly
3. Ensure CSS file is imported in your main app file
4. Test accessibility with keyboard navigation

---

**Happy migrating! Your app will have access to 30 production-ready components with enhanced functionality and design system integration.** 🚀