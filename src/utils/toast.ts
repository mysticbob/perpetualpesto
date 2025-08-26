/**
 * Toast utility for use outside React components
 * Uses Chakra UI's createStandaloneToast
 */

import { createStandaloneToast } from '@chakra-ui/react'

const { toast, ToastContainer } = createStandaloneToast()

// Create a toast function that matches the expected API
const showToast = (options: any) => {
  if (typeof options === 'string') {
    return toast({
      description: options,
      status: 'info',
      duration: 3000,
      isClosable: true,
    })
  }
  return toast({
    duration: 3000,
    isClosable: true,
    ...options,
  })
}

export { ToastContainer }
export default showToast
export { showToast as toast }