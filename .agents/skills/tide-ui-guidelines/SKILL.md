# Microcopy Guidelines for Tide UI

## Core Principles

### Use Sentence Case

**Always use sentence case for all UI text**, including buttons, labels, tooltips, error messages, and component text.

**Examples:**
- "Create new account"
- "Save changes"
- "Export to CSV"
- "Create New Account" (title case)
- "Save Changes" (title case)

**Why sentence case?**
- More conversational and approachable
- Easier to read and scan quickly
- Better accessibility for users with dyslexia
- Cleaner appearance in modern interfaces
- Industry standard (Google, Apple, Microsoft, Material Design)

### Punctuation Rules

**Omit periods after single sentences** in UI elements to reduce visual noise and improve scannability.

**No periods for:**
- Button labels: "Save", "Cancel", "Create account"
- Tooltips: "This action cannot be undone"
- Form labels: "Email address", "Password"
- Modal titles: "Delete account"
- Error messages: "Email is required"
- Helper text: "Must be at least 8 characters"
- Subheadings: "Account settings"

**Use periods when:**
- Multiple complete sentences appear together: "Your changes have been saved. You can now close this window."
- Long descriptive text that forms complete sentences

**Example:**
```tsx
// CORRECT - Single sentence, no period
<TooltipContent>This action cannot be undone</TooltipContent>

// CORRECT - Multiple sentences, use periods
<AlertDescription>
  Your account has been created. Please check your email to verify.
</AlertDescription>

// WRONG - Single sentence with period
<Button>Save changes.</Button>
```

## Exceptions

**Proper nouns and brand names** retain their original capitalization:
- "Sign in with Google"
- "Export to Slack"
- "Connected to GitHub"

## Implementation

When writing Storybook stories, component examples, or default text:
1. Always use sentence case
2. Omit periods for single sentences
3. Keep text concise and scannable
4. Prioritize clarity over cleverness

## References

These guidelines align with industry standards from:
- Material Design (Google)
- GitLab Pajamas Design System
- PatternFly Design System
- Splunk Style Guide
- Open edX Design System

For more details, see:
- [Material Design Style Guide](https://m3.material.io/foundations/content-design/style-guide/grammar-and-punctuation)
- [Punctuation in UX/UI Microcopy](https://ux.stackexchange.com/questions/122147/periods-in-ux-ui-microcopy)
- [GitLab Punctuation Guidelines](https://design.gitlab.com/content/punctuation/)
