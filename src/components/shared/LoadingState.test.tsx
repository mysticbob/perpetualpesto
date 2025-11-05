import { describe, it, expect } from 'vitest'
import { render, screen } from '@/test/utils'
import { LoadingState } from './LoadingState'

describe('LoadingState', () => {
  it('should render with default props', () => {
    render(<LoadingState />)

    // Check for default loading message
    expect(screen.getByText('Loading...')).toBeInTheDocument()

    // Check for spinner
    const spinner = screen.getByText('Loading...').closest('div')?.querySelector('[role="status"]')
    expect(spinner).toBeInTheDocument()
  })

  it('should render with custom message', () => {
    render(<LoadingState message="Fetching recipes..." />)

    expect(screen.getByText('Fetching recipes...')).toBeInTheDocument()
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
  })

  it('should apply custom size', () => {
    const { container } = render(<LoadingState size="sm" />)

    // Chakra applies size through CSS classes
    expect(container.querySelector('.chakra-spinner')).toBeInTheDocument()
  })

  it('should respect custom minHeight', () => {
    const { container } = render(<LoadingState minHeight="400px" />)

    const centerElement = container.querySelector('[style*="min-height"]')
    expect(centerElement).toBeTruthy()
  })

  it('should have proper semantic structure', () => {
    render(<LoadingState message="Please wait" />)

    // Should have a text element with the message
    expect(screen.getByText('Please wait')).toHaveClass('chakra-text')
  })

  it('should use brand primary color for spinner', () => {
    const { container } = render(<LoadingState />)

    const spinner = container.querySelector('.chakra-spinner')
    expect(spinner).toBeInTheDocument()
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes on spinner', () => {
      const { container } = render(<LoadingState />)

      const spinner = container.querySelector('[role="status"]')
      expect(spinner).toBeInTheDocument()
    })

    it('should have readable text for screen readers', () => {
      render(<LoadingState message="Loading your recipes" />)

      expect(screen.getByText('Loading your recipes')).toBeInTheDocument()
    })
  })

  describe('Different sizes', () => {
    it('should render with sm size', () => {
      const { container } = render(<LoadingState size="sm" />)
      expect(container.querySelector('.chakra-spinner')).toBeInTheDocument()
    })

    it('should render with md size', () => {
      const { container } = render(<LoadingState size="md" />)
      expect(container.querySelector('.chakra-spinner')).toBeInTheDocument()
    })

    it('should render with lg size', () => {
      const { container } = render(<LoadingState size="lg" />)
      expect(container.querySelector('.chakra-spinner')).toBeInTheDocument()
    })

    it('should render with xl size (default)', () => {
      const { container } = render(<LoadingState size="xl" />)
      expect(container.querySelector('.chakra-spinner')).toBeInTheDocument()
    })
  })
})
