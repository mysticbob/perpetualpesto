import { extendTheme, type ThemeConfig } from '@chakra-ui/react'

const config: ThemeConfig = {
  initialColorMode: 'system',
  useSystemColorMode: true,
}

// Design tokens
const colors = {
  brand: {
    50: '#E6F6F4',
    100: '#B8E7E1',
    200: '#8AD8CD',
    300: '#5CC9B9',
    400: '#2EBAA6',
    500: '#00AB92', // Primary brand color
    600: '#008976',
    700: '#006759',
    800: '#00453C',
    900: '#00231F',
  },
  accent: {
    50: '#FFF5F5',
    100: '#FED7D7',
    200: '#FEB2B2',
    300: '#FC8181',
    400: '#F56565',
    500: '#E53E3E',
    600: '#C53030',
    700: '#9B2C2C',
    800: '#822727',
    900: '#63171B',
  },
}

const semanticTokens = {
  colors: {
    // Brand colors
    'brand.primary': {
      default: 'brand.500',
      _dark: 'brand.400',
    },
    'brand.secondary': {
      default: 'teal.600',
      _dark: 'teal.300',
    },

    // Backgrounds
    'bg.canvas': {
      default: 'gray.50',
      _dark: 'gray.900',
    },
    'bg.surface': {
      default: 'white',
      _dark: 'gray.800',
    },
    'bg.elevated': {
      default: 'white',
      _dark: 'gray.700',
    },
    'bg.hover': {
      default: 'gray.50',
      _dark: 'gray.700',
    },
    'bg.selected': {
      default: 'brand.50',
      _dark: 'rgba(0, 171, 146, 0.16)',
    },

    // Text colors
    'text.primary': {
      default: 'gray.900',
      _dark: 'gray.100',
    },
    'text.secondary': {
      default: 'gray.600',
      _dark: 'gray.400',
    },
    'text.muted': {
      default: 'gray.500',
      _dark: 'gray.500',
    },

    // Border colors
    'border.default': {
      default: 'gray.200',
      _dark: 'gray.600',
    },
    'border.emphasized': {
      default: 'gray.300',
      _dark: 'gray.500',
    },

    // State colors
    'state.success': {
      default: 'green.500',
      _dark: 'green.400',
    },
    'state.warning': {
      default: 'orange.500',
      _dark: 'orange.400',
    },
    'state.error': {
      default: 'red.500',
      _dark: 'red.400',
    },
    'state.info': {
      default: 'blue.500',
      _dark: 'blue.400',
    },
  },
}

const fonts = {
  heading: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
}

const fontSizes = {
  xs: '0.75rem',    // 12px
  sm: '0.875rem',   // 14px
  md: '1rem',       // 16px
  lg: '1.125rem',   // 18px
  xl: '1.25rem',    // 20px
  '2xl': '1.5rem',  // 24px
  '3xl': '1.875rem',// 30px
  '4xl': '2.25rem', // 36px
  '5xl': '3rem',    // 48px
}

const space = {
  px: '1px',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  2: '0.5rem',      // 8px
  3: '0.75rem',     // 12px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  8: '2rem',        // 32px
  10: '2.5rem',     // 40px
  12: '3rem',       // 48px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
}

const radii = {
  none: '0',
  sm: '0.125rem',   // 2px
  base: '0.25rem',  // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  '3xl': '1.5rem',  // 24px
  full: '9999px',
}

const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  outline: '0 0 0 3px rgba(0, 171, 146, 0.6)',
}

// Component style overrides
const components = {
  Button: {
    baseStyle: {
      fontWeight: 'medium',
      borderRadius: 'lg',
      _focus: {
        boxShadow: 'outline',
      },
    },
    sizes: {
      sm: {
        fontSize: 'sm',
        px: 3,
        py: 2,
      },
      md: {
        fontSize: 'md',
        px: 4,
        py: 2,
      },
      lg: {
        fontSize: 'lg',
        px: 6,
        py: 3,
      },
    },
    variants: {
      solid: (props: any) => {
        const { colorScheme } = props
        if (colorScheme === 'brand') {
          return {
            bg: 'brand.primary',
            color: 'white',
            _hover: {
              bg: 'brand.600',
              _disabled: {
                bg: 'brand.primary',
              },
            },
            _active: {
              bg: 'brand.700',
            },
          }
        }
        return {}
      },
      ghost: {
        _hover: {
          bg: 'bg.hover',
        },
      },
    },
    defaultProps: {
      colorScheme: 'brand',
    },
  },

  Card: {
    baseStyle: {
      container: {
        bg: 'bg.surface',
        borderRadius: 'xl',
        boxShadow: 'sm',
        border: '1px solid',
        borderColor: 'border.default',
        transition: 'all 0.2s',
        _hover: {
          boxShadow: 'md',
        },
      },
    },
  },

  Input: {
    baseStyle: {
      field: {
        borderRadius: 'lg',
        _focus: {
          borderColor: 'brand.primary',
          boxShadow: '0 0 0 1px var(--chakra-colors-brand-primary)',
        },
      },
    },
    defaultProps: {
      focusBorderColor: 'brand.primary',
    },
  },

  Select: {
    baseStyle: {
      field: {
        borderRadius: 'lg',
        _focus: {
          borderColor: 'brand.primary',
          boxShadow: '0 0 0 1px var(--chakra-colors-brand-primary)',
        },
      },
    },
    defaultProps: {
      focusBorderColor: 'brand.primary',
    },
  },

  Textarea: {
    baseStyle: {
      borderRadius: 'lg',
      _focus: {
        borderColor: 'brand.primary',
        boxShadow: '0 0 0 1px var(--chakra-colors-brand-primary)',
      },
    },
    defaultProps: {
      focusBorderColor: 'brand.primary',
    },
  },

  Modal: {
    baseStyle: {
      dialog: {
        borderRadius: '2xl',
        bg: 'bg.surface',
      },
      header: {
        fontSize: '2xl',
        fontWeight: 'bold',
        color: 'text.primary',
      },
    },
  },

  Badge: {
    baseStyle: {
      borderRadius: 'md',
      px: 2,
      py: 0.5,
      fontWeight: 'medium',
      fontSize: 'xs',
      textTransform: 'none',
    },
  },

  Heading: {
    baseStyle: {
      color: 'text.primary',
      fontWeight: 'bold',
    },
  },

  Text: {
    baseStyle: {
      color: 'text.primary',
    },
  },
}

const styles = {
  global: (props: any) => ({
    body: {
      bg: 'bg.canvas',
      color: 'text.primary',
    },
    '*::placeholder': {
      color: 'text.muted',
    },
    '*, *::before, *::after': {
      borderColor: 'border.default',
    },
    // Smooth scrolling
    html: {
      scrollBehavior: 'smooth',
    },
  }),
}

// Standardized layout constants
export const LAYOUT = {
  sidebar: {
    expanded: '240px',
    collapsed: '80px',
  },
  header: {
    height: '64px',
  },
  content: {
    maxWidth: '1400px',
    padding: 6,
  },
  card: {
    padding: 6,
  },
}

export const theme = extendTheme({
  config,
  colors,
  semanticTokens,
  fonts,
  fontSizes,
  space,
  radii,
  shadows,
  components,
  styles,
})
