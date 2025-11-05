# 🎨 UX Design System & Guidelines

Comprehensive design system for Perpetual Pesto - ensuring consistent, modern, and accessible user experience.

---

## 📋 Table of Contents

1. [Design Principles](#design-principles)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing & Layout](#spacing--layout)
5. [Components](#components)
6. [Patterns](#patterns)
7. [Accessibility](#accessibility)
8. [Dark Mode](#dark-mode)
9. [Migration Guide](#migration-guide)

---

## 🎯 Design Principles

### 1. **Consistency Over Novelty**
Use established patterns. Users shouldn't need to learn new interactions for each page.

### 2. **Progressive Disclosure**
Show what's important first. Hide complexity behind clear actions.

### 3. **Immediate Feedback**
Every action gets instant visual feedback (loading states, success/error messages).

### 4. **Mobile-First Responsive**
Design works beautifully on all screen sizes.

### 5. **Accessible By Default**
Keyboard navigation, screen readers, high contrast - all built in.

---

## 🎨 Color System

### Brand Colors

```typescript
import { useToken } from '@chakra-ui/react'

// Primary brand color
<Button colorScheme="brand">Click Me</Button>

// Access raw values
const brandPrimary = useToken('colors', 'brand.primary')
```

**Brand Palette:**
```
brand.50  - #E6F6F4 (lightest)
brand.500 - #00AB92 (primary)
brand.900 - #00231F (darkest)
```

### Semantic Tokens

**Always use semantic tokens** instead of hardcoded colors:

```typescript
// ❌ WRONG - Hardcoded color
<Box bg="#38BDAF" color="white" />

// ✅ CORRECT - Semantic token
<Box bg="brand.primary" color="white" />

// ✅ CORRECT - Adaptive semantic token
<Box bg="bg.surface" color="text.primary" />
```

**Available Semantic Tokens:**

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `brand.primary` | brand.500 | brand.400 | Primary actions |
| `bg.canvas` | gray.50 | gray.900 | Page background |
| `bg.surface` | white | gray.800 | Card backgrounds |
| `bg.elevated` | white | gray.700 | Modals, popovers |
| `bg.hover` | gray.50 | gray.700 | Hover states |
| `bg.selected` | brand.50 | rgba(...) | Selected items |
| `text.primary` | gray.900 | gray.100 | Main text |
| `text.secondary` | gray.600 | gray.400 | Secondary text |
| `text.muted` | gray.500 | gray.500 | Disabled text |
| `border.default` | gray.200 | gray.600 | Borders |
| `state.success` | green.500 | green.400 | Success messages |
| `state.error` | red.500 | red.400 | Error messages |

---

## 📝 Typography

### Font Stack

```
-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif
```

### Heading Sizes

```tsx
<Heading size="5xl">Extra Large (48px)</Heading>
<Heading size="4xl">Large (36px)</Heading>
<Heading size="3xl">Medium-Large (30px)</Heading>
<Heading size="2xl">Medium (24px)</Heading> {/* Page titles */}
<Heading size="xl">Small (20px)</Heading>  {/* Section headers */}
<Heading size="lg">XSmall (18px)</Heading> {/* Card titles */}
```

### Text Sizes

```tsx
<Text fontSize="xs">12px - Tiny labels</Text>
<Text fontSize="sm">14px - Secondary text</Text>
<Text fontSize="md">16px - Body text (default)</Text>
<Text fontSize="lg">18px - Emphasized text</Text>
```

### Best Practices

```tsx
// ✅ Use semantic color tokens
<Heading color="text.primary">Title</Heading>
<Text color="text.secondary">Description</Text>

// ❌ Don't hardcode colors
<Heading color="gray.900">Title</Heading>
```

---

## 📏 Spacing & Layout

### Standardized Constants

```typescript
import { LAYOUT } from '@/theme'

// Sidebar widths
LAYOUT.sidebar.expanded  // 240px
LAYOUT.sidebar.collapsed // 80px

// Content constraints
LAYOUT.content.maxWidth  // 1400px
LAYOUT.content.padding   // 24px (6 * 4px)
```

### Spacing Scale

Use the `spacing` prop with our scale:

```tsx
<VStack spacing={8}>  {/* 32px - Between major sections */}
<VStack spacing={6}>  {/* 24px - Between related groups */}
<VStack spacing={4}>  {/* 16px - Between items */}
<VStack spacing={2}>  {/* 8px - Tight spacing */}
```

### Layout Patterns

**Two-Column Layout:**
```tsx
<Grid
  templateColumns={{ base: '1fr', lg: '1fr 320px' }}
  gap={6}
  minH="calc(100vh - 64px)"
>
  <Box>{/* Main content */}</Box>
  <Box>{/* Sidebar */}</Box>
</Grid>
```

**Container Pattern:**
```tsx
<Container maxW={LAYOUT.content.maxWidth} py={LAYOUT.content.padding}>
  <VStack spacing={8} align="stretch">
    {/* Content */}
  </VStack>
</Container>
```

---

## 🧩 Components

### Shared Components

Located in `src/components/shared/`:

#### LoadingState

```tsx
import { LoadingState } from '@/components/shared'

<LoadingState message="Loading recipes..." />
<LoadingState size="sm" minHeight="100px" />
```

#### EmptyState

```tsx
import { EmptyState } from '@/components/shared'

<EmptyState
  icon="📝"
  title="No recipes yet"
  description="Start by adding your first recipe!"
  action={{
    label: "Add Recipe",
    onClick: handleAdd
  }}
/>
```

#### ErrorState

```tsx
import { ErrorState } from '@/components/shared'

<ErrorState
  title="Failed to load recipes"
  message={error.message}
  onRetry={refetch}
/>
```

#### PageHeader

```tsx
import { PageHeader } from '@/components/shared'

<PageHeader
  title="My Pantry"
  onBack={() => navigate(-1)}
  actions={
    <Button onClick={handleAdd}>Add Item</Button>
  }
/>
```

#### SearchBar

```tsx
import { SearchBar } from '@/components/shared'

<SearchBar
  value={searchTerm}
  onChange={setSearchTerm}
  placeholder="Search recipes..."
/>
```

### Button Guidelines

```tsx
// Primary action
<Button colorScheme="brand">Save</Button>

// Secondary action
<Button variant="outline">Cancel</Button>

// Destructive action
<Button colorScheme="red">Delete</Button>

// Ghost (minimal)
<Button variant="ghost">Skip</Button>

// Icon button
<IconButton
  aria-label="Delete"
  icon={<DeleteIcon />}
  variant="ghost"
  colorScheme="red"
/>
```

### Input Guidelines

```tsx
// All inputs automatically get brand-colored focus rings
<Input placeholder="Enter name..." />

<Select placeholder="Choose option">
  <option>Option 1</option>
</Select>

<Textarea placeholder="Add notes..." />
```

### Card Guidelines

```tsx
<Card>
  <CardHeader>
    <Heading size="md">Card Title</Heading>
  </CardHeader>
  <CardBody>
    <Text>Card content goes here</Text>
  </CardBody>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

### Modal Guidelines

```tsx
const { isOpen, onOpen, onClose } = useDisclosure()

<Modal isOpen={isOpen} onClose={onClose} size="lg">
  <ModalOverlay />
  <ModalContent>
    <ModalHeader>Add New Item</ModalHeader>
    <ModalCloseButton />
    <ModalBody>
      {/* Form fields */}
    </ModalBody>
    <ModalFooter>
      <Button variant="ghost" mr={3} onClick={onClose}>
        Cancel
      </Button>
      <Button colorScheme="brand" onClick={handleSave}>
        Save
      </Button>
    </ModalFooter>
  </ModalContent>
</Modal>
```

---

## 🎭 Patterns

### Loading States

**Always show loading feedback for async operations:**

```tsx
const [loading, setLoading] = useState(false)

if (loading) {
  return <LoadingState message="Saving..." />
}
```

### Error Handling

**Show user-friendly error messages:**

```tsx
const [error, setError] = useState<string | null>(null)

if (error) {
  return <ErrorState message={error} onRetry={refetch} />
}
```

### Empty States

**Guide users when lists are empty:**

```tsx
if (items.length === 0) {
  return (
    <EmptyState
      icon="📦"
      title="No items in pantry"
      description="Add items to start tracking your ingredients"
      action={{ label: "Add Item", onClick: onAdd }}
    />
  )
}
```

### Form Validation

```tsx
import { useToast } from '@chakra-ui/react'

const toast = useToast()

const handleSubmit = async () => {
  try {
    await saveData()
    toast({
      title: 'Success',
      description: 'Item saved successfully',
      status: 'success',
      duration: 3000,
    })
  } catch (error) {
    toast({
      title: 'Error',
      description: 'Failed to save item',
      status: 'error',
      duration: 5000,
    })
  }
}
```

### Confirmation Dialogs

```tsx
<AlertDialog isOpen={isOpen} onClose={onClose}>
  <AlertDialogOverlay>
    <AlertDialogContent>
      <AlertDialogHeader>Delete Recipe?</AlertDialogHeader>
      <AlertDialogBody>
        This action cannot be undone.
      </AlertDialogBody>
      <AlertDialogFooter>
        <Button ref={cancelRef} onClick={onClose}>
          Cancel
        </Button>
        <Button colorScheme="red" onClick={handleDelete} ml={3}>
          Delete
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialogOverlay>
</AlertDialog>
```

---

## ♿ Accessibility

### Keyboard Navigation

**All interactive elements must be keyboard accessible:**

```tsx
// ✅ Button - keyboard accessible by default
<Button onClick={handleClick}>Click Me</Button>

// ✅ Custom clickable with keyboard support
<Box
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick()
    }
  }}
>
  Custom Button
</Box>
```

### ARIA Labels

```tsx
// Icon buttons need aria-label
<IconButton
  aria-label="Delete recipe"
  icon={<DeleteIcon />}
/>

// Form inputs need labels
<FormControl>
  <FormLabel htmlFor="name">Recipe Name</FormLabel>
  <Input id="name" />
</FormControl>

// Loading states need aria-live
<Box aria-live="polite" aria-busy={loading}>
  {loading ? 'Loading...' : content}
</Box>
```

### Color Contrast

**All text meets WCAG AA standards:**
- Normal text: 4.5:1 contrast ratio
- Large text: 3:1 contrast ratio

Use semantic tokens to ensure proper contrast in both modes.

---

## 🌓 Dark Mode

### Automatic Support

**Our semantic tokens handle dark mode automatically:**

```tsx
// This works in both light and dark mode
<Box bg="bg.surface" color="text.primary">
  <Heading color="text.primary">Title</Heading>
  <Text color="text.secondary">Description</Text>
</Box>
```

### Testing Dark Mode

Toggle dark mode in your browser:
1. Open DevTools
2. Cmd/Ctrl + Shift + P
3. Type "Emulate CSS prefers-color-scheme: dark"

Or use Chakra's color mode switcher:

```tsx
import { useColorMode, IconButton } from '@chakra-ui/react'
import { MoonIcon, SunIcon } from '@chakra-ui/icons'

function ColorModeToggle() {
  const { colorMode, toggleColorMode } = useColorMode()

  return (
    <IconButton
      aria-label="Toggle color mode"
      icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
      onClick={toggleColorMode}
    />
  )
}
```

### Dark Mode Best Practices

```tsx
// ✅ Use semantic tokens
<Box bg="bg.surface" borderColor="border.default" />

// ❌ Don't use raw colors
<Box bg="white" borderColor="gray.200" />

// ✅ Use colorMode-aware values when needed
import { useColorModeValue } from '@chakra-ui/react'

const borderColor = useColorModeValue('gray.200', 'gray.700')
```

---

## 🔄 Migration Guide

### Fixing Hardcoded Colors

**Before:**
```tsx
const brandColor = '#38BDAF'

<Button
  style={{ backgroundColor: brandColor, color: 'white' }}
  onClick={handleClick}
>
  Save
</Button>
```

**After:**
```tsx
<Button
  colorScheme="brand"
  onClick={handleClick}
>
  Save
</Button>
```

### Fixing Hardcoded API URLs

**Before:**
```tsx
const response = await fetch('http://localhost:3001/api/recipes')
```

**After:**
```tsx
import { buildUrl, API_ENDPOINTS } from '@/config/api'

const response = await fetch(buildUrl(API_ENDPOINTS.recipes.list))
```

### Adding Loading States

**Before:**
```tsx
const [recipes, setRecipes] = useState([])

useEffect(() => {
  fetchRecipes().then(setRecipes)
}, [])

return (
  <VStack>
    {recipes.map(recipe => <RecipeCard key={recipe.id} recipe={recipe} />)}
  </VStack>
)
```

**After:**
```tsx
import { LoadingState, EmptyState } from '@/components/shared'

const [recipes, setRecipes] = useState([])
const [loading, setLoading] = useState(true)

useEffect(() => {
  setLoading(true)
  fetchRecipes()
    .then(setRecipes)
    .finally(() => setLoading(false))
}, [])

if (loading) {
  return <LoadingState message="Loading recipes..." />
}

if (recipes.length === 0) {
  return (
    <EmptyState
      icon="🍳"
      title="No recipes yet"
      description="Start by adding your first recipe!"
    />
  )
}

return (
  <VStack spacing={4}>
    {recipes.map(recipe => <RecipeCard key={recipe.id} recipe={recipe} />)}
  </VStack>
)
```

---

## 📐 Component Checklist

When creating a new component, ensure it has:

- [ ] **Semantic tokens** for all colors (no hardcoded values)
- [ ] **Loading state** for async operations
- [ ] **Empty state** for zero-item lists
- [ ] **Error state** with retry option
- [ ] **TypeScript interfaces** for all props
- [ ] **ARIA labels** for icon buttons and custom controls
- [ ] **Keyboard navigation** support
- [ ] **Responsive design** (mobile, tablet, desktop)
- [ ] **Dark mode** support (automatically via semantic tokens)
- [ ] **Consistent spacing** using theme scale

---

## 🎯 Common Patterns Reference

### List with Search/Filter

```tsx
import { SearchBar, LoadingState, EmptyState } from '@/components/shared'

function RecipeList() {
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [recipes, setRecipes] = useState([])

  const filteredRecipes = recipes.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <LoadingState />

  return (
    <VStack spacing={4} align="stretch">
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search recipes..."
      />

      {filteredRecipes.length === 0 ? (
        <EmptyState
          title={search ? 'No matches found' : 'No recipes yet'}
          description={search ? 'Try a different search term' : undefined}
        />
      ) : (
        <VStack spacing={2}>
          {filteredRecipes.map(recipe => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </VStack>
      )}
    </VStack>
  )
}
```

### Modal Form

```tsx
function AddItemModal({ isOpen, onClose, onSave }) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave({ name })
      toast({
        title: 'Success',
        description: 'Item added successfully',
        status: 'success',
      })
      onClose()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add item',
        status: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Add New Item</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <FormControl>
            <FormLabel>Name</FormLabel>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name..."
            />
          </FormControl>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorScheme="brand"
            onClick={handleSave}
            isLoading={saving}
            isDisabled={!name.trim()}
          >
            Save
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
```

---

## 📚 Resources

- [Chakra UI Documentation](https://chakra-ui.com/docs)
- [WCAG Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Material Design Color System](https://material.io/design/color/the-color-system.html)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)

---

**Version**: 2.0.0
**Last Updated**: 2025-11-05
**Maintained By**: UX Team
