import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Progress,
  SimpleGrid,
  Badge,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Alert,
  AlertIcon,
  AlertDescription,
  Heading,
  Divider,
  useColorModeValue,
  Spinner,
  Button,
  Select,
} from '@chakra-ui/react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { FaDollarSign, FaRobot, FaChartLine, FaExclamationTriangle } from 'react-icons/fa';

interface UsageMetrics {
  period: string;
  totalTokens: number;
  totalCost: number;
  features: {
    chat: { calls: number; tokens: number; cost: number };
    vision: { calls: number; tokens: number; cost: number };
    voice: { calls: number; tokens: number; cost: number };
    suggestions: { calls: number; tokens: number; cost: number };
  };
  topCommands: Array<{ intent: string; count: number }>;
  averageResponseTime: number;
  successRate: number;
  errorRate: number;
}

interface UsageLimits {
  warnings: string[];
  limits: {
    daily: { used: number; limit: number; percentage: number };
    monthly: { used: number; limit: number; percentage: number };
  };
}

const AIAnalyticsDashboard: React.FC = () => {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [metrics, setMetrics] = useState<UsageMetrics | null>(null);
  const [limits, setLimits] = useState<UsageLimits | null>(null);
  const [loading, setLoading] = useState(true);
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch user metrics
      const metricsResponse = await fetch(`/api/ai/analytics/metrics?period=${period}`);
      const metricsData = await metricsResponse.json();
      setMetrics(metricsData);

      // Fetch usage limits
      const limitsResponse = await fetch('/api/ai/analytics/limits');
      const limitsData = await limitsResponse.json();
      setLimits(limitsData);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box p={6} display="flex" justifyContent="center">
        <Spinner size="xl" />
      </Box>
    );
  }

  if (!metrics) {
    return (
      <Alert status="error">
        <AlertIcon />
        <AlertDescription>Failed to load analytics data</AlertDescription>
      </Alert>
    );
  }

  // Prepare chart data
  const featureData = Object.entries(metrics.features).map(([name, data]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    calls: data.calls,
    tokens: data.tokens,
    cost: data.cost,
  }));

  const COLORS = ['#3182CE', '#38A169', '#D69E2E', '#E53E3E'];

  const costByFeature = featureData.map((f, index) => ({
    name: f.name,
    value: f.cost,
    color: COLORS[index % COLORS.length],
  }));

  return (
    <Box p={6}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <Heading size="lg">AI Usage Analytics</Heading>
          <Select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            w="150px"
          >
            <option value="day">Last 24 Hours</option>
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
          </Select>
        </HStack>

        {/* Warnings */}
        {limits?.warnings && limits.warnings.length > 0 && (
          <Alert status="warning" borderRadius="md">
            <AlertIcon />
            <VStack align="start" spacing={1}>
              {limits.warnings.map((warning, index) => (
                <Text key={index} fontSize="sm">
                  {warning}
                </Text>
              ))}
            </VStack>
          </Alert>
        )}

        {/* Key Metrics */}
        <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4}>
          <Stat bg={bgColor} p={4} borderRadius="lg" borderWidth={1} borderColor={borderColor}>
            <StatLabel>Total Tokens</StatLabel>
            <StatNumber>{metrics.totalTokens.toLocaleString()}</StatNumber>
            <StatHelpText>
              {period === 'day' ? 'Today' : `Last ${period}`}
            </StatHelpText>
          </Stat>

          <Stat bg={bgColor} p={4} borderRadius="lg" borderWidth={1} borderColor={borderColor}>
            <StatLabel>Total Cost</StatLabel>
            <StatNumber>${metrics.totalCost.toFixed(2)}</StatNumber>
            <StatHelpText>
              <StatArrow type={metrics.totalCost > 10 ? 'decrease' : 'increase'} />
              {metrics.totalCost > 10 ? 'High usage' : 'Normal usage'}
            </StatHelpText>
          </Stat>

          <Stat bg={bgColor} p={4} borderRadius="lg" borderWidth={1} borderColor={borderColor}>
            <StatLabel>Success Rate</StatLabel>
            <StatNumber>{metrics.successRate}%</StatNumber>
            <Progress
              value={metrics.successRate}
              colorScheme={metrics.successRate > 90 ? 'green' : metrics.successRate > 70 ? 'yellow' : 'red'}
              size="sm"
              mt={2}
            />
          </Stat>

          <Stat bg={bgColor} p={4} borderRadius="lg" borderWidth={1} borderColor={borderColor}>
            <StatLabel>Avg Response Time</StatLabel>
            <StatNumber>{metrics.averageResponseTime}ms</StatNumber>
            <StatHelpText>
              {metrics.averageResponseTime < 1000 ? 'Fast' : metrics.averageResponseTime < 2000 ? 'Normal' : 'Slow'}
            </StatHelpText>
          </Stat>
        </SimpleGrid>

        {/* Usage Limits */}
        {limits && (
          <Box bg={bgColor} p={4} borderRadius="lg" borderWidth={1} borderColor={borderColor}>
            <Text fontWeight="bold" mb={3}>Usage Limits</Text>
            <VStack spacing={3} align="stretch">
              <Box>
                <HStack justify="space-between" mb={1}>
                  <Text fontSize="sm">Daily Token Usage</Text>
                  <Text fontSize="sm">{limits.limits.daily.percentage}%</Text>
                </HStack>
                <Progress
                  value={limits.limits.daily.percentage}
                  colorScheme={limits.limits.daily.percentage > 80 ? 'red' : limits.limits.daily.percentage > 60 ? 'yellow' : 'blue'}
                  size="sm"
                />
                <Text fontSize="xs" color="gray.500" mt={1}>
                  {limits.limits.daily.used.toLocaleString()} / {limits.limits.daily.limit.toLocaleString()} tokens
                </Text>
              </Box>

              <Box>
                <HStack justify="space-between" mb={1}>
                  <Text fontSize="sm">Monthly Token Usage</Text>
                  <Text fontSize="sm">{limits.limits.monthly.percentage}%</Text>
                </HStack>
                <Progress
                  value={limits.limits.monthly.percentage}
                  colorScheme={limits.limits.monthly.percentage > 80 ? 'red' : limits.limits.monthly.percentage > 60 ? 'yellow' : 'blue'}
                  size="sm"
                />
                <Text fontSize="xs" color="gray.500" mt={1}>
                  {limits.limits.monthly.used.toLocaleString()} / {limits.limits.monthly.limit.toLocaleString()} tokens
                </Text>
              </Box>
            </VStack>
          </Box>
        )}

        <Tabs>
          <TabList>
            <Tab>Feature Usage</Tab>
            <Tab>Cost Breakdown</Tab>
            <Tab>Top Commands</Tab>
          </TabList>

          <TabPanels>
            {/* Feature Usage */}
            <TabPanel>
              <Box bg={bgColor} p={4} borderRadius="lg" borderWidth={1} borderColor={borderColor}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={featureData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="calls" fill="#3182CE" name="API Calls" />
                    <Bar dataKey="tokens" fill="#38A169" name="Tokens Used" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </TabPanel>

            {/* Cost Breakdown */}
            <TabPanel>
              <Box bg={bgColor} p={4} borderRadius="lg" borderWidth={1} borderColor={borderColor}>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={costByFeature}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: $${entry.value.toFixed(2)}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {costByFeature.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </TabPanel>

            {/* Top Commands */}
            <TabPanel>
              <Box bg={bgColor} p={4} borderRadius="lg" borderWidth={1} borderColor={borderColor}>
                <VStack spacing={3} align="stretch">
                  {metrics.topCommands.map((cmd, index) => (
                    <HStack key={index} justify="space-between">
                      <HStack>
                        <Badge colorScheme="blue">{index + 1}</Badge>
                        <Text>{cmd.intent.replace(/_/g, ' ')}</Text>
                      </HStack>
                      <Text fontWeight="bold">{cmd.count} times</Text>
                    </HStack>
                  ))}
                  {metrics.topCommands.length === 0 && (
                    <Text color="gray.500" textAlign="center">No commands recorded yet</Text>
                  )}
                </VStack>
              </Box>
            </TabPanel>
          </TabPanels>
        </Tabs>

        {/* Feature Stats */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
          {Object.entries(metrics.features).map(([feature, data]) => (
            <Box
              key={feature}
              bg={bgColor}
              p={4}
              borderRadius="lg"
              borderWidth={1}
              borderColor={borderColor}
            >
              <VStack align="start" spacing={2}>
                <HStack>
                  <FaRobot />
                  <Text fontWeight="bold" textTransform="capitalize">
                    {feature}
                  </Text>
                </HStack>
                <Divider />
                <HStack justify="space-between" w="full">
                  <Text fontSize="sm">Calls:</Text>
                  <Text fontSize="sm" fontWeight="bold">{data.calls}</Text>
                </HStack>
                <HStack justify="space-between" w="full">
                  <Text fontSize="sm">Tokens:</Text>
                  <Text fontSize="sm" fontWeight="bold">{data.tokens.toLocaleString()}</Text>
                </HStack>
                <HStack justify="space-between" w="full">
                  <Text fontSize="sm">Cost:</Text>
                  <Text fontSize="sm" fontWeight="bold">${data.cost.toFixed(3)}</Text>
                </HStack>
              </VStack>
            </Box>
          ))}
        </SimpleGrid>
      </VStack>
    </Box>
  );
};

export default AIAnalyticsDashboard;