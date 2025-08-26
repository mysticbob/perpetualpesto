/**
 * BillingHistory Component
 * Displays past payments and invoices
 */

import React, { useState } from 'react'
import {
  Box,
  VStack,
  HStack,
  Text,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableCaption,
  Badge,
  Button,
  IconButton,
  useColorModeValue,
  Container,
  Skeleton,
  SkeletonText,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Tooltip,
  Link,
} from '@chakra-ui/react'
import {
  DownloadIcon,
  ExternalLinkIcon,
  ChevronDownIcon,
  SearchIcon,
  RepeatIcon,
} from '@chakra-ui/icons'
import { format, parseISO } from 'date-fns'
import { FaFilePdf, FaReceipt, FaFilter } from 'react-icons/fa'
import { useBillingHistory } from '../../hooks/useBilling'
import type { Invoice } from '../../types/billing'

const STATUS_COLORS: Record<Invoice['status'], string> = {
  paid: 'green',
  open: 'blue',
  draft: 'gray',
  void: 'red',
}

const STATUS_LABELS: Record<Invoice['status'], string> = {
  paid: 'Paid',
  open: 'Open',
  draft: 'Draft',
  void: 'Void',
}

export const BillingHistory: React.FC = () => {
  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const hoverBg = useColorModeValue('gray.50', 'gray.700')
  
  const { data: invoices, isLoading, refetch, isRefetching } = useBillingHistory()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<Invoice['status'] | 'all'>('all')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  // Filter and sort invoices
  const filteredInvoices = React.useMemo(() => {
    if (!invoices) return []
    
    let filtered = [...invoices]
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === statusFilter)
    }
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(invoice => 
        invoice.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.amount.toString().includes(searchTerm)
      )
    }
    
    // Sort by date
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
    })
    
    return filtered
  }, [invoices, searchTerm, statusFilter, sortOrder])
  
  const handleDownloadInvoice = (invoice: Invoice) => {
    if (invoice.pdfUrl) {
      window.open(invoice.pdfUrl, '_blank')
    }
  }
  
  const handleViewInvoice = (invoice: Invoice) => {
    if (invoice.invoiceUrl) {
      window.open(invoice.invoiceUrl, '_blank')
    }
  }
  
  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount / 100) // Stripe amounts are in cents
  }
  
  if (isLoading) {
    return (
      <Container maxW="6xl" py={10}>
        <VStack spacing={6} align="stretch">
          <Skeleton height="40px" />
          <Skeleton height="60px" />
          <SkeletonText mt="4" noOfLines={10} spacing="4" />
        </VStack>
      </Container>
    )
  }
  
  if (!invoices || invoices.length === 0) {
    return (
      <Container maxW="6xl" py={10}>
        <VStack spacing={6} align="stretch">
          <Heading size="xl">Billing History</Heading>
          <Alert status="info">
            <AlertIcon />
            <Box>
              <AlertTitle>No billing history</AlertTitle>
              <AlertDescription>
                You don't have any invoices yet. Invoices will appear here after your first payment.
              </AlertDescription>
            </Box>
          </Alert>
        </VStack>
      </Container>
    )
  }
  
  return (
    <Container maxW="6xl" py={10}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <VStack align="start" spacing={2}>
            <Heading size="xl">Billing History</Heading>
            <Text color="gray.500">
              View and download your past invoices and receipts
            </Text>
          </VStack>
          <Tooltip label="Refresh billing history">
            <IconButton
              aria-label="Refresh"
              icon={<RepeatIcon />}
              onClick={() => refetch()}
              isLoading={isRefetching}
            />
          </Tooltip>
        </HStack>
        
        {/* Filters */}
        <HStack spacing={4}>
          <InputGroup maxW="300px">
            <InputLeftElement pointerEvents="none">
              <SearchIcon color="gray.300" />
            </InputLeftElement>
            <Input
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
          
          <Select
            maxW="200px"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as Invoice['status'] | 'all')}
            icon={<FaFilter />}
          >
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="open">Open</option>
            <option value="draft">Draft</option>
            <option value="void">Void</option>
          </Select>
          
          <Button
            variant="outline"
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            leftIcon={<ChevronDownIcon transform={sortOrder === 'asc' ? 'rotate(180deg)' : ''} />}
          >
            {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
          </Button>
        </HStack>
        
        {/* Invoices Table */}
        <Box
          bg={bgColor}
          borderWidth="1px"
          borderColor={borderColor}
          borderRadius="lg"
          overflow="hidden"
        >
          <Table variant="simple">
            <TableCaption>
              Showing {filteredInvoices.length} of {invoices.length} invoices
            </TableCaption>
            <Thead>
              <Tr>
                <Th>Invoice Date</Th>
                <Th>Period</Th>
                <Th>Amount</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredInvoices.map((invoice) => (
                <Tr
                  key={invoice.id}
                  _hover={{ bg: hoverBg }}
                  transition="background 0.2s"
                >
                  <Td>
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="medium">
                        {format(new Date(invoice.createdAt), 'MMM dd, yyyy')}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {format(new Date(invoice.createdAt), 'h:mm a')}
                      </Text>
                    </VStack>
                  </Td>
                  <Td>
                    <Text fontSize="sm">
                      {format(new Date(invoice.periodStart), 'MMM dd')} - {format(new Date(invoice.periodEnd), 'MMM dd, yyyy')}
                    </Text>
                  </Td>
                  <Td>
                    <Text fontWeight="semibold">
                      {formatCurrency(invoice.amount, invoice.currency)}
                    </Text>
                  </Td>
                  <Td>
                    <Badge
                      colorScheme={STATUS_COLORS[invoice.status]}
                      px={2}
                      py={1}
                    >
                      {STATUS_LABELS[invoice.status]}
                    </Badge>
                  </Td>
                  <Td>
                    <HStack spacing={2}>
                      {invoice.invoiceUrl && (
                        <Tooltip label="View invoice">
                          <IconButton
                            aria-label="View invoice"
                            icon={<ExternalLinkIcon />}
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewInvoice(invoice)}
                          />
                        </Tooltip>
                      )}
                      {invoice.pdfUrl && (
                        <Tooltip label="Download PDF">
                          <IconButton
                            aria-label="Download PDF"
                            icon={<DownloadIcon />}
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownloadInvoice(invoice)}
                          />
                        </Tooltip>
                      )}
                      <Menu>
                        <MenuButton
                          as={IconButton}
                          aria-label="More actions"
                          icon={<ChevronDownIcon />}
                          size="sm"
                          variant="ghost"
                        />
                        <MenuList>
                          {invoice.invoiceUrl && (
                            <MenuItem
                              icon={<FaReceipt />}
                              onClick={() => handleViewInvoice(invoice)}
                            >
                              View Invoice
                            </MenuItem>
                          )}
                          {invoice.pdfUrl && (
                            <MenuItem
                              icon={<FaFilePdf />}
                              onClick={() => handleDownloadInvoice(invoice)}
                            >
                              Download PDF
                            </MenuItem>
                          )}
                          <MenuItem
                            icon={<ExternalLinkIcon />}
                            as={Link}
                            href={`mailto:support@nochickenleftbehind.com?subject=Invoice ${invoice.id}`}
                            isExternal
                          >
                            Contact Support
                          </MenuItem>
                        </MenuList>
                      </Menu>
                    </HStack>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
        
        {/* Summary Stats */}
        <HStack spacing={6} pt={4}>
          <VStack align="start" spacing={1}>
            <Text fontSize="sm" color="gray.500">Total Paid</Text>
            <Text fontSize="lg" fontWeight="bold">
              {formatCurrency(
                invoices
                  .filter(i => i.status === 'paid')
                  .reduce((sum, i) => sum + i.amount, 0),
                'USD'
              )}
            </Text>
          </VStack>
          <VStack align="start" spacing={1}>
            <Text fontSize="sm" color="gray.500">Outstanding</Text>
            <Text fontSize="lg" fontWeight="bold">
              {formatCurrency(
                invoices
                  .filter(i => i.status === 'open')
                  .reduce((sum, i) => sum + i.amount, 0),
                'USD'
              )}
            </Text>
          </VStack>
          <VStack align="start" spacing={1}>
            <Text fontSize="sm" color="gray.500">Total Invoices</Text>
            <Text fontSize="lg" fontWeight="bold">
              {invoices.length}
            </Text>
          </VStack>
        </HStack>
      </VStack>
    </Container>
  )
}