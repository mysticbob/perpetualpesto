import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/test/utils'
import { ErrorState } from './ErrorState'

describe('ErrorState', () => {
  it('should render with required message prop', () => {
    render(<ErrorState message="Failed to load data" />)

    expect(screen.getByText('Failed to load data')).toBeInTheDocument()
  })

  it('should render with default title', () => {
    render(<ErrorState message="Error occurred" />)

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Error occurred')).toBeInTheDocument()
  })

  it('should render with custom title', () => {
    render(
      <ErrorState
        title="Network Error"
        message="Could not connect to server"
      />
    )

    expect(screen.getByText('Network Error')).toBeInTheDocument()
    expect(screen.getByText('Could not connect to server')).toBeInTheDocument()
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })

  it('should render retry button when onRetry provided', () => {
    const handleRetry = vi.fn()

    render(
      <ErrorState
        message="Failed to load"
        onRetry={handleRetry}
      />
    )

    const button = screen.getByRole('button', { name: 'Try Again' })
    expect(button).toBeInTheDocument()
  })

  it('should not render retry button when onRetry not provided', () => {
    render(<ErrorState message="Failed to load" />)

    expect(screen.queryByRole('button', { name: 'Try Again' })).not.toBeInTheDocument()
  })

  it('should call onRetry when button clicked', () => {
    const handleRetry = vi.fn()

    render(
      <ErrorState
        message="Failed to load"
        onRetry={handleRetry}
      />
    )

    const button = screen.getByRole('button', { name: 'Try Again' })
    button.click()

    expect(handleRetry).toHaveBeenCalledTimes(1)
  })

  it('should respect custom minHeight', () => {
    const { container } = render(
      <ErrorState message="Error" minHeight="500px" />
    )

    const vstack = container.querySelector('.chakra-stack')
    expect(vstack).toBeTruthy()
  })

  it('should use default minHeight when not specified', () => {
    const { container } = render(<ErrorState message="Error" />)

    const vstack = container.querySelector('.chakra-stack')
    expect(vstack).toBeTruthy()
  })

  describe('Styling', () => {
    it('should have error status on alert', () => {
      const { container } = render(<ErrorState message="Error" />)

      const alert = container.querySelector('[role="alert"]')
      expect(alert).toBeInTheDocument()
    })

    it('should have proper alert icon', () => {
      const { container } = render(<ErrorState message="Error" />)

      const icon = container.querySelector('.chakra-alert__icon')
      expect(icon).toBeInTheDocument()
    })

    it('should center align content', () => {
      const { container } = render(<ErrorState message="Error" />)

      const alert = container.querySelector('[role="alert"]')
      expect(alert).toHaveStyle({ textAlign: 'center' })
    })
  })

  describe('Accessibility', () => {
    it('should have proper role for alert', () => {
      const { container } = render(<ErrorState message="Critical error" />)

      const alert = container.querySelector('[role="alert"]')
      expect(alert).toBeInTheDocument()
    })

    it('should have accessible retry button', () => {
      render(
        <ErrorState
          message="Error"
          onRetry={vi.fn()}
        />
      )

      const button = screen.getByRole('button', { name: 'Try Again' })
      expect(button).toBeInTheDocument()
    })

    it('should have properly structured alert content', () => {
      render(
        <ErrorState
          title="Custom Error"
          message="Detailed error message"
        />
      )

      // Title should be in AlertTitle
      expect(screen.getByText('Custom Error')).toBeInTheDocument()

      // Message should be in AlertDescription
      expect(screen.getByText('Detailed error message')).toBeInTheDocument()
    })
  })

  describe('Real-world scenarios', () => {
    it('should handle network error with retry', () => {
      const handleRetry = vi.fn()

      render(
        <ErrorState
          title="Connection Failed"
          message="Unable to reach the server. Please check your internet connection."
          onRetry={handleRetry}
        />
      )

      expect(screen.getByText('Connection Failed')).toBeInTheDocument()
      expect(screen.getByText('Unable to reach the server. Please check your internet connection.')).toBeInTheDocument()

      const retryButton = screen.getByRole('button', { name: 'Try Again' })
      retryButton.click()

      expect(handleRetry).toHaveBeenCalled()
    })

    it('should handle data fetch error without retry', () => {
      render(
        <ErrorState
          title="Data Unavailable"
          message="The requested recipe could not be found."
        />
      )

      expect(screen.getByText('Data Unavailable')).toBeInTheDocument()
      expect(screen.getByText('The requested recipe could not be found.')).toBeInTheDocument()
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('should handle permission error', () => {
      render(
        <ErrorState
          title="Access Denied"
          message="You don't have permission to view this content."
        />
      )

      expect(screen.getByText('Access Denied')).toBeInTheDocument()
      expect(screen.getByText("You don't have permission to view this content.")).toBeInTheDocument()
    })
  })
})
