import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Flex,
  VStack,
  HStack,
  Input,
  IconButton,
  Text,
  Avatar,
  useColorModeValue,
  Collapse,
  Badge,
  Button,
  Spinner,
  Tooltip,
  useToast,
  Divider,
  Fade,
  ScaleFade,
} from '@chakra-ui/react';
import {
  ChatIcon,
  CloseIcon,
  ArrowUpIcon,
  DeleteIcon,
  RepeatIcon,
  SettingsIcon,
  AttachmentIcon,
  SmallAddIcon,
} from '@chakra-ui/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

interface ChatInterfaceProps {
  onCommand?: (command: string) => void;
  defaultOpen?: boolean;
  position?: 'bottom-right' | 'bottom-left' | 'center';
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  onCommand,
  defaultOpen = false,
  position = 'bottom-right',
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your kitchen assistant. Try asking me things like:\n• 'Add 2 pounds of chicken to the fridge'\n• 'What can I make for dinner?'\n• 'What's expiring soon?'",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const toast = useToast();

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const userBg = useColorModeValue('blue.500', 'blue.600');
  const assistantBg = useColorModeValue('gray.100', 'gray.700');
  const inputBg = useColorModeValue('gray.50', 'gray.900');

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
      status: 'sending',
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      // Call the backend API
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: input }],
          userId: user?.uid || 'anonymous',
        }),
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
        };

        // Update user message status
        setMessages(prev =>
          prev.map(msg =>
            msg.id === userMessage.id ? { ...msg, status: 'sent' } : msg
          )
        );

        // Add assistant response
        setTimeout(() => {
          setMessages(prev => [...prev, assistantMessage]);
          setIsTyping(false);
        }, 500);

        // Execute command if handler provided
        if (onCommand) {
          onCommand(input);
        }
      } else {
        throw new Error(data.error || 'Failed to process message');
      }
    } catch (error) {
      console.error('Chat error:', error);
      
      // Update user message status to error
      setMessages(prev =>
        prev.map(msg =>
          msg.id === userMessage.id ? { ...msg, status: 'error' } : msg
        )
      );

      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      
      setIsTyping(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: Date.now().toString(),
        role: 'assistant',
        content: "Chat cleared. How can I help you?",
        timestamp: new Date(),
      },
    ]);
  };

  const suggestedCommands = [
    "What's in my fridge?",
    "Add milk to grocery list",
    "Find recipes with chicken",
    "Check expiration dates",
  ];

  const getPositionStyles = () => {
    switch (position) {
      case 'bottom-left':
        return { bottom: 4, left: 4 };
      case 'center':
        return { bottom: '50%', left: '50%', transform: 'translate(-50%, 50%)' };
      default:
        return { bottom: 4, right: 4 };
    }
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            style={{
              position: 'fixed',
              ...getPositionStyles(),
              zIndex: 1000,
            }}
          >
            <Tooltip label="Open AI Assistant" placement="left">
              <IconButton
                icon={<ChatIcon />}
                aria-label="Open chat"
                colorScheme="blue"
                size="lg"
                isRound
                onClick={() => setIsOpen(true)}
                shadow="lg"
                _hover={{ transform: 'scale(1.1)' }}
              />
            </Tooltip>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Interface */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            style={{
              position: 'fixed',
              ...getPositionStyles(),
              zIndex: 1000,
            }}
          >
            <Box
              bg={bgColor}
              borderWidth={1}
              borderColor={borderColor}
              borderRadius="lg"
              shadow="2xl"
              w={{ base: '95vw', sm: '380px' }}
              h={{ base: '70vh', sm: '600px' }}
              maxH="80vh"
              display="flex"
              flexDirection="column"
            >
              {/* Header */}
              <Flex
                p={4}
                borderBottomWidth={1}
                borderColor={borderColor}
                align="center"
                justify="space-between"
              >
                <HStack spacing={3}>
                  <Avatar size="sm" bg="blue.500" icon={<ChatIcon />} />
                  <VStack align="start" spacing={0}>
                    <Text fontWeight="bold">Kitchen Assistant</Text>
                    <Badge colorScheme="green" fontSize="xs">
                      Online
                    </Badge>
                  </VStack>
                </HStack>
                <HStack>
                  <Tooltip label="Clear chat">
                    <IconButton
                      icon={<DeleteIcon />}
                      aria-label="Clear chat"
                      size="sm"
                      variant="ghost"
                      onClick={clearChat}
                    />
                  </Tooltip>
                  <Tooltip label="Close">
                    <IconButton
                      icon={<CloseIcon />}
                      aria-label="Close chat"
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsOpen(false)}
                    />
                  </Tooltip>
                </HStack>
              </Flex>

              {/* Messages */}
              <VStack
                flex={1}
                overflowY="auto"
                p={4}
                spacing={4}
                align="stretch"
              >
                {messages.map((message) => (
                  <ScaleFade key={message.id} in={true} initialScale={0.9}>
                    <Flex
                      justify={message.role === 'user' ? 'flex-end' : 'flex-start'}
                    >
                      <Box
                        maxW="80%"
                        bg={message.role === 'user' ? userBg : assistantBg}
                        color={message.role === 'user' ? 'white' : undefined}
                        px={4}
                        py={2}
                        borderRadius="lg"
                        position="relative"
                      >
                        <Text fontSize="sm" whiteSpace="pre-wrap">
                          {message.content}
                        </Text>
                        {message.status === 'sending' && (
                          <Spinner size="xs" position="absolute" bottom={1} right={1} />
                        )}
                        {message.status === 'error' && (
                          <Badge colorScheme="red" position="absolute" bottom={1} right={1}>
                            Failed
                          </Badge>
                        )}
                        <Text fontSize="xs" opacity={0.7} mt={1}>
                          {message.timestamp.toLocaleTimeString()}
                        </Text>
                      </Box>
                    </Flex>
                  </ScaleFade>
                ))}
                
                {isTyping && (
                  <Flex justify="flex-start">
                    <Box
                      bg={assistantBg}
                      px={4}
                      py={2}
                      borderRadius="lg"
                    >
                      <HStack spacing={1}>
                        <Box
                          as={motion.div}
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 1.5, repeat: Infinity } as any}
                          w={2}
                          h={2}
                          bg="gray.500"
                          borderRadius="full"
                        />
                        <Box
                          as={motion.div}
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 } as any}
                          w={2}
                          h={2}
                          bg="gray.500"
                          borderRadius="full"
                        />
                        <Box
                          as={motion.div}
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 } as any}
                          w={2}
                          h={2}
                          bg="gray.500"
                          borderRadius="full"
                        />
                      </HStack>
                    </Box>
                  </Flex>
                )}
                
                <div ref={messagesEndRef} />
              </VStack>

              {/* Suggested Commands */}
              {messages.length === 1 && (
                <Box px={4} pb={2}>
                  <Text fontSize="xs" mb={2} opacity={0.7}>
                    Try these commands:
                  </Text>
                  <Flex wrap="wrap" gap={2}>
                    {suggestedCommands.map((cmd) => (
                      <Button
                        key={cmd}
                        size="xs"
                        variant="outline"
                        onClick={() => setInput(cmd)}
                      >
                        {cmd}
                      </Button>
                    ))}
                  </Flex>
                </Box>
              )}

              {/* Input */}
              <Box p={4} borderTopWidth={1} borderColor={borderColor}>
                <HStack>
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    bg={inputBg}
                    size="md"
                    isDisabled={isLoading}
                  />
                  <IconButton
                    icon={<ArrowUpIcon />}
                    aria-label="Send message"
                    colorScheme="blue"
                    onClick={handleSend}
                    isLoading={isLoading}
                    isDisabled={!input.trim()}
                  />
                </HStack>
              </Box>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatInterface;