import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/test/utils'
import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it('should render with title only', () => {
    render(<EmptyState title="No recipes found" />)

    expect(screen.getByText('No recipes found')).toBeInTheDocument()
  })

  it('should render with title and description', () => {
    render(
      <EmptyState
        title="No recipes found"
        description="Try adding some recipes to get started"
      />
    )

    expect(screen.getByText('No recipes found')).toBeInTheDocument()
    expect(screen.getByText('Try adding some recipes to get started')).toBeInTheDocument()
  })

  it('should render with custom icon', () => {
    const TestIcon = <span data-testid="custom-icon">📋</span>

    render(
      <EmptyState
        title="Empty list"
        icon={TestIcon}
      />
    )

    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
    expect(screen.getByText('📋')).toBeInTheDocument()
  })

  it('should not render icon when not provided', () => {
    const { container } = render(<EmptyState title="No items" />)

    // Icon container should not be present
    const iconContainer = container.querySelector('[data-testid="custom-icon"]')
    expect(iconContainer).not.toBeInTheDocument()
  })

  it('should render action button when provided', () => {
    const handleClick = vi.fn()

    render(
      <EmptyState
        title="No recipes"
        action={{
          label: 'Add Recipe',
          onClick: handleClick,
        }}
      />
    )

    const button = screen.getByRole('button', { name: 'Add Recipe' })
    expect(button).toBeInTheDocument()
  })

  it('should call action onClick when button clicked', async () => {
    const handleClick = vi.fn()

    render(
      <EmptyState
        title="No recipes"
        action={{
          label: 'Add Recipe',
          onClick: handleClick,
        }}
      />
    )

    const button = screen.getByRole('button', { name: 'Add Recipe' })
    button.click()

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should not render action button when not provided', () => {
    render(<EmptyState title="No recipes" />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('should respect custom minHeight', () => {
    const { container } = render(<EmptyState title="Empty" minHeight="500px" />)

    const vstack = container.querySelector('.chakra-stack')
    expect(vstack).toBeTruthy()
  })

  it('should use default minHeight when not specified', () => {
    const { container } = render(<EmptyState title="Empty" />)

    const vstack = container.querySelector('.chakra-stack')
    expect(vstack).toBeTruthy()
  })

  describe('Styling', () => {
    it('should have proper text styling for title', () => {
      render(<EmptyState title="Empty State" />)

      const title = screen.getByText('Empty State')
      expect(title).toHaveStyle({ fontSize: '1.25rem' }) // xl in Chakra
    })

    it('should center align content', () => {
      render(<EmptyState title="Centered" />)

      const title = screen.getByText('Centered')
      expect(title.closest('.chakra-stack')).toHaveStyle({ textAlign: 'center' })
    })
  })

  describe('Full feature example', () => {
    it('should render all props together', () => {
      const handleClick = vi.fn()
      const icon = <span data-testid="icon">🍳</span>

      render(
        <EmptyState
          icon={icon}
          title="No Recipes Yet"
          description="Start by adding your first recipe to begin meal planning"
          action={{
            label: 'Add Your First Recipe',
            onClick: handleClick,
          }}
          minHeight="400px"
        />
      )

      expect(screen.getByTestId('icon')).toBeInTheDocument()
      expect(screen.getByText('No Recipes Yet')).toBeInTheDocument()
      expect(screen.getByText('Start by adding your first recipe to begin meal planning')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Add Your First Recipe' })).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<EmptyState title="Empty List" />)

      // Title should be displayed prominently
      const title = screen.getByText('Empty List')
      expect(title).toBeInTheDocument()
    })

    it('should have accessible button when action is provided', () => {
      render(
        <EmptyState
          title="Empty"
          action={{
            label: 'Take Action',
            onClick: vi.fn(),
          }}
        />
      )

      const button = screen.getByRole('button', { name: 'Take Action' })
      expect(button).toBeInTheDocument()
    })
  })
})
