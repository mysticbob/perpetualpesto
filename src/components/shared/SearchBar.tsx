import { Input, InputGroup, InputLeftElement } from '@chakra-ui/react'
import { SearchIcon } from '@chakra-ui/icons'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  size?: 'sm' | 'md' | 'lg'
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  size = 'md'
}: SearchBarProps) {
  return (
    <InputGroup size={size}>
      <InputLeftElement pointerEvents="none">
        <SearchIcon color="text.muted" />
      </InputLeftElement>
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        bg="bg.surface"
        _placeholder={{ color: 'text.muted' }}
      />
    </InputGroup>
  )
}
