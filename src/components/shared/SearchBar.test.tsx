import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@/test/utils'
import { SearchBar } from './SearchBar'
import { userEvent } from '@testing-library/user-event'

describe('SearchBar', () => {
  const user = userEvent.setup()

  it('should render with default placeholder', () => {
    render(<SearchBar value="" onChange={vi.fn()} />)

    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
  })

  it('should render with custom placeholder', () => {
    render(
      <SearchBar
        value=""
        onChange={vi.fn()}
        placeholder="Search recipes..."
      />
    )

    expect(screen.getByPlaceholderText('Search recipes...')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument()
  })

  it('should display current value', () => {
    render(<SearchBar value="chocolate" onChange={vi.fn()} />)

    const input = screen.getByRole('textbox')
    expect(input).toHaveValue('chocolate')
  })

  it('should call onChange when typing', async () => {
    const handleChange = vi.fn()

    render(<SearchBar value="" onChange={handleChange} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'pasta')

    await waitFor(() => {
      expect(handleChange).toHaveBeenCalled()
    })

    // Should be called for each character
    expect(handleChange).toHaveBeenCalledTimes(5) // p, a, s, t, a
  })

  it('should call onChange with correct value', async () => {
    let currentValue = ''
    const handleChange = vi.fn((newValue: string) => {
      currentValue = newValue
    })

    const { rerender } = render(
      <SearchBar value={currentValue} onChange={handleChange} />
    )

    const input = screen.getByRole('textbox')
    await user.type(input, 'a')

    await waitFor(() => {
      expect(handleChange).toHaveBeenCalledWith('a')
    })

    // Rerender with updated value
    rerender(<SearchBar value="a" onChange={handleChange} />)

    await user.type(input, 'b')

    await waitFor(() => {
      expect(handleChange).toHaveBeenLastCalledWith('ab')
    })
  })

  it('should display search icon', () => {
    const { container } = render(<SearchBar value="" onChange={vi.fn()} />)

    // Chakra's InputLeftElement should contain an icon
    const iconElement = container.querySelector('.chakra-input__left-element')
    expect(iconElement).toBeInTheDocument()
  })

  describe('Clearing input', () => {
    it('should clear value when user deletes text', async () => {
      const handleChange = vi.fn()

      render(<SearchBar value="test" onChange={handleChange} />)

      const input = screen.getByRole('textbox')

      // Select all and delete
      await user.clear(input)

      await waitFor(() => {
        expect(handleChange).toHaveBeenLastCalledWith('')
      })
    })
  })

  describe('Styling', () => {
    it('should render as Chakra Input component', () => {
      const { container } = render(<SearchBar value="" onChange={vi.fn()} />)

      const input = container.querySelector('.chakra-input')
      expect(input).toBeInTheDocument()
    })

    it('should have InputGroup wrapper', () => {
      const { container } = render(<SearchBar value="" onChange={vi.fn()} />)

      const inputGroup = container.querySelector('.chakra-input__group')
      expect(inputGroup).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should be accessible as a textbox', () => {
      render(<SearchBar value="" onChange={vi.fn()} />)

      const input = screen.getByRole('textbox')
      expect(input).toBeInTheDocument()
    })

    it('should have placeholder for screen readers', () => {
      render(
        <SearchBar
          value=""
          onChange={vi.fn()}
          placeholder="Search for recipes"
        />
      )

      const input = screen.getByPlaceholderText('Search for recipes')
      expect(input).toBeInTheDocument()
    })

    it('should be keyboard accessible', async () => {
      const handleChange = vi.fn()

      render(<SearchBar value="" onChange={handleChange} />)

      const input = screen.getByRole('textbox')

      // Tab to focus
      await user.tab()

      // Input should be focused
      expect(input).toHaveFocus()
    })
  })

  describe('Real-world scenarios', () => {
    it('should handle recipe search', async () => {
      const handleChange = vi.fn()

      const { rerender } = render(
        <SearchBar
          value=""
          onChange={handleChange}
          placeholder="Search recipes..."
        />
      )

      const input = screen.getByRole('textbox')

      // Type search query
      await user.type(input, 'chicken')

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalled()
      })

      // Simulate parent updating value
      rerender(
        <SearchBar
          value="chicken"
          onChange={handleChange}
          placeholder="Search recipes..."
        />
      )

      expect(input).toHaveValue('chicken')
    })

    it('should handle rapid typing', async () => {
      const handleChange = vi.fn()

      render(<SearchBar value="" onChange={handleChange} />)

      const input = screen.getByRole('textbox')

      // Type quickly
      await user.type(input, 'spaghetti', { delay: 10 })

      await waitFor(() => {
        expect(handleChange).toHaveBeenCalled()
      })

      // All characters should trigger onChange
      expect(handleChange).toHaveBeenCalledTimes(9)
    })

    it('should handle backspace', async () => {
      const handleChange = vi.fn()

      const { rerender } = render(
        <SearchBar value="pasta" onChange={handleChange} />
      )

      const input = screen.getByRole('textbox')

      // Select and delete last character
      await user.click(input)
      await user.keyboard('{Backspace}')

      await waitFor(() => {
        expect(handleChange).toHaveBeenLastCalledWith('past')
      })
    })
  })
})
