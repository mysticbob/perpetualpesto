import { HStack, Heading, IconButton, Spacer, Box } from '@chakra-ui/react'
import { ArrowBackIcon } from '@chakra-ui/icons'
import { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  onBack?: () => void
  actions?: ReactNode
}

export function PageHeader({ title, onBack, actions }: PageHeaderProps) {
  return (
    <Box
      position="sticky"
      top={0}
      zIndex={10}
      bg="bg.surface"
      borderBottom="1px"
      borderColor="border.default"
      px={6}
      py={4}
      mb={6}
    >
      <HStack spacing={4}>
        {onBack && (
          <IconButton
            aria-label="Go back"
            icon={<ArrowBackIcon />}
            variant="ghost"
            onClick={onBack}
          />
        )}
        <Heading size="lg">{title}</Heading>
        <Spacer />
        {actions && <HStack spacing={2}>{actions}</HStack>}
      </HStack>
    </Box>
  )
}
