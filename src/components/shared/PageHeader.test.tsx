import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/test/utils'
import { PageHeader } from './PageHeader'
import { Button } from '@chakra-ui/react'

describe('PageHeader', () => {
  it('should render with title only', () => {
    render(<PageHeader title="My Recipes" />)

    expect(screen.getByRole('heading', { name: 'My Recipes' })).toBeInTheDocument()
  })

  it('should render back button when onBack provided', () => {
    const handleBack = vi.fn()

    render(<PageHeader title="Recipe Details" onBack={handleBack} />)

    const backButton = screen.getByLabelText('Go back')
    expect(backButton).toBeInTheDocument()
  })

  it('should call onBack when back button clicked', () => {
    const handleBack = vi.fn()

    render(<PageHeader title="Recipe Details" onBack={handleBack} />)

    const backButton = screen.getByLabelText('Go back')
    backButton.click()

    expect(handleBack).toHaveBeenCalledTimes(1)
  })

  it('should not render back button when onBack not provided', () => {
    render(<PageHeader title="My Recipes" />)

    expect(screen.queryByLabelText('Go back')).not.toBeInTheDocument()
  })

  it('should render action buttons', () => {
    const actions = (
      <>
        <Button size="sm">Edit</Button>
        <Button size="sm" colorScheme="red">Delete</Button>
      </>
    )

    render(<PageHeader title="Recipe" actions={actions} />)

    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('should not render actions when not provided', () => {
    render(<PageHeader title="Recipe" />)

    // Only heading should be present, no buttons
    const buttons = screen.queryAllByRole('button')
    expect(buttons).toHaveLength(0)
  })

  describe('Layout', () => {
    it('should have sticky positioning', () => {
      const { container } = render(<PageHeader title="Test" />)

      const headerBox = container.firstChild as HTMLElement
      expect(headerBox).toHaveStyle({ position: 'sticky', top: 0 })
    })

    it('should have border at bottom', () => {
      const { container } = render(<PageHeader title="Test" />)

      const headerBox = container.firstChild as HTMLElement
      expect(headerBox).toHaveStyle({ borderBottom: '1px' })
    })

    it('should use surface background color', () => {
      const { container } = render(<PageHeader title="Test" />)

      const headerBox = container.firstChild as HTMLElement
      expect(headerBox).toBeTruthy()
    })
  })

  describe('Full feature example', () => {
    it('should render with all props', () => {
      const handleBack = vi.fn()
      const actions = (
        <>
          <Button size="sm">Save</Button>
          <Button size="sm" colorScheme="red">Cancel</Button>
        </>
      )

      render(
        <PageHeader
          title="Edit Recipe"
          onBack={handleBack}
          actions={actions}
        />
      )

      expect(screen.getByRole('heading', { name: 'Edit Recipe' })).toBeInTheDocument()
      expect(screen.getByLabelText('Go back')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading level', () => {
      render(<PageHeader title="My Page" />)

      const heading = screen.getByRole('heading', { name: 'My Page' })
      expect(heading.tagName).toBe('H2') // Chakra's lg heading is h2
    })

    it('should have accessible back button', () => {
      const handleBack = vi.fn()

      render(<PageHeader title="Details" onBack={handleBack} />)

      const backButton = screen.getByLabelText('Go back')
      expect(backButton).toHaveAttribute('type', 'button')
    })
  })

  describe('Real-world scenarios', () => {
    it('should work as recipe detail page header', () => {
      const handleBack = vi.fn()
      const handleEdit = vi.fn()
      const handleDelete = vi.fn()

      const actions = (
        <>
          <Button size="sm" onClick={handleEdit}>Edit</Button>
          <Button size="sm" colorScheme="red" onClick={handleDelete}>Delete</Button>
        </>
      )

      render(
        <PageHeader
          title="Chocolate Chip Cookies"
          onBack={handleBack}
          actions={actions}
        />
      )

      // Navigate back
      screen.getByLabelText('Go back').click()
      expect(handleBack).toHaveBeenCalled()

      // Edit recipe
      screen.getByRole('button', { name: 'Edit' }).click()
      expect(handleEdit).toHaveBeenCalled()

      // Delete recipe
      screen.getByRole('button', { name: 'Delete' }).click()
      expect(handleDelete).toHaveBeenCalled()
    })

    it('should work as list page header without back button', () => {
      const handleAdd = vi.fn()

      const actions = (
        <Button size="sm" colorScheme="brand" onClick={handleAdd}>
          Add Recipe
        </Button>
      )

      render(
        <PageHeader
          title="All Recipes"
          actions={actions}
        />
      )

      expect(screen.getByRole('heading', { name: 'All Recipes' })).toBeInTheDocument()
      expect(screen.queryByLabelText('Go back')).not.toBeInTheDocument()

      screen.getByRole('button', { name: 'Add Recipe' }).click()
      expect(handleAdd).toHaveBeenCalled()
    })
  })
})
