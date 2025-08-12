import React, { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import Compressor from 'compressorjs';
import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Image,
  SimpleGrid,
  Badge,
  Spinner,
  useToast,
  IconButton,
  Flex,
  Progress,
  Alert,
  AlertIcon,
  useColorModeValue,
} from '@chakra-ui/react';
import {
  AddIcon,
  CheckIcon,
  CloseIcon,
  RepeatIcon,
  ViewIcon,
} from '@chakra-ui/icons';
import { useAI } from '../../contexts/AIContext';
import { usePantry } from '../../contexts/PantryContext';

interface CameraCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onItemsDetected?: (items: DetectedItem[]) => void;
  mode?: 'pantry' | 'grocery' | 'leftovers';
}

interface DetectedItem {
  name: string;
  quantity?: string;
  category?: string;
  confidence: number;
  selected: boolean;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({
  isOpen,
  onClose,
  onItemsDetected,
  mode = 'pantry',
}) => {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [detectedItems, setDetectedItems] = useState<DetectedItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const webcamRef = useRef<Webcam>(null);
  const { analyzeImage } = useAI();
  const { addItems } = usePantry();
  const toast = useToast();
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Camera constraints for mobile and desktop
  const videoConstraints = {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: { ideal: 'environment' }, // Use back camera on mobile
  };

  const handleUserMedia = useCallback(() => {
    setIsCameraReady(true);
    setCameraError(null);
  }, []);

  const handleUserMediaError = useCallback((error: any) => {
    console.error('Camera error:', error);
    setCameraError('Unable to access camera. Please check permissions.');
    setIsCameraReady(false);
  }, []);

  const capture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setCapturedImage(imageSrc);
        processImage(imageSrc);
      }
    }
  }, []);

  const processImage = async (imageData: string) => {
    setIsProcessing(true);
    try {
      // Compress the image before sending
      const compressedImage = await compressImage(imageData);
      
      // Analyze with AI
      const result = await analyzeImage(compressedImage);
      
      if (result.success && result.items.length > 0) {
        const itemsWithSelection = result.items.map(item => ({
          ...item,
          selected: true,
        }));
        setDetectedItems(itemsWithSelection);
        
        toast({
          title: 'Items detected!',
          description: `Found ${result.items.length} items in the image`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'No items detected',
          description: 'Try taking a clearer photo with better lighting',
          status: 'warning',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Image processing error:', error);
      toast({
        title: 'Processing failed',
        description: 'Could not analyze the image. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const compressImage = (base64: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Convert base64 to blob
      fetch(base64)
        .then(res => res.blob())
        .then(blob => {
          new Compressor(blob, {
            quality: 0.8,
            maxWidth: 1024,
            maxHeight: 1024,
            success(result) {
              const reader = new FileReader();
              reader.onloadend = () => {
                resolve(reader.result as string);
              };
              reader.readAsDataURL(result);
            },
            error(err) {
              reject(err);
            },
          });
        })
        .catch(reject);
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageData = reader.result as string;
        setCapturedImage(imageData);
        processImage(imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleItemSelection = (index: number) => {
    setDetectedItems(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const handleAddItems = async () => {
    const selectedItems = detectedItems.filter(item => item.selected);
    
    if (selectedItems.length === 0) {
      toast({
        title: 'No items selected',
        description: 'Please select at least one item to add',
        status: 'warning',
        duration: 2000,
        isClosable: true,
      });
      return;
    }

    try {
      if (mode === 'pantry') {
        await addItems(selectedItems.map(item => ({
          name: item.name,
          quantity: item.quantity || '1',
          category: item.category,
        })));
        
        toast({
          title: 'Items added!',
          description: `Added ${selectedItems.length} items to your pantry`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
      
      if (onItemsDetected) {
        onItemsDetected(selectedItems);
      }
      
      handleClose();
    } catch (error) {
      console.error('Error adding items:', error);
      toast({
        title: 'Error',
        description: 'Failed to add items. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleClose = () => {
    setCapturedImage(null);
    setDetectedItems([]);
    setIsProcessing(false);
    setCameraError(null);
    onClose();
  };

  const retake = () => {
    setCapturedImage(null);
    setDetectedItems([]);
  };

  const getModeTitle = () => {
    switch (mode) {
      case 'grocery':
        return 'Scan Groceries';
      case 'leftovers':
        return 'Save Leftovers';
      default:
        return 'Scan Pantry Items';
    }
  };

  const getModeDescription = () => {
    switch (mode) {
      case 'grocery':
        return 'Take a photo of your groceries to add them to your pantry';
      case 'leftovers':
        return 'Capture your leftovers to track them';
      default:
        return 'Scan items to add them to your pantry inventory';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl">
      <ModalOverlay />
      <ModalContent bg={bgColor} maxW="90vw" maxH="90vh">
        <ModalHeader>{getModeTitle()}</ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          <VStack spacing={4}>
            <Text fontSize="sm" color="gray.600">
              {getModeDescription()}
            </Text>

            {!capturedImage ? (
              <Box w="full">
                {cameraError ? (
                  <Alert status="error" borderRadius="md">
                    <AlertIcon />
                    {cameraError}
                  </Alert>
                ) : (
                  <>
                    <Box
                      position="relative"
                      w="full"
                      h="400px"
                      borderRadius="lg"
                      overflow="hidden"
                      border="2px solid"
                      borderColor={borderColor}
                    >
                      <Webcam
                        ref={webcamRef}
                        audio={false}
                        screenshotFormat="image/jpeg"
                        videoConstraints={videoConstraints}
                        onUserMedia={handleUserMedia}
                        onUserMediaError={handleUserMediaError}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                      
                      {!isCameraReady && (
                        <Flex
                          position="absolute"
                          top={0}
                          left={0}
                          right={0}
                          bottom={0}
                          bg="blackAlpha.700"
                          align="center"
                          justify="center"
                        >
                          <VStack>
                            <Spinner size="xl" color="white" />
                            <Text color="white">Loading camera...</Text>
                          </VStack>
                        </Flex>
                      )}
                    </Box>

                    <HStack mt={4} justify="center" spacing={4}>
                      <Button
                        leftIcon={<AddIcon />}
                        colorScheme="blue"
                        size="lg"
                        onClick={capture}
                        isDisabled={!isCameraReady}
                      >
                        Capture
                      </Button>
                      
                      <Button
                        as="label"
                        leftIcon={<ViewIcon />}
                        variant="outline"
                        cursor="pointer"
                      >
                        Upload Photo
                        <input
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={handleFileUpload}
                        />
                      </Button>
                    </HStack>
                  </>
                )}
              </Box>
            ) : (
              <VStack spacing={4} w="full">
                <Box position="relative" w="full">
                  <Image
                    src={capturedImage}
                    alt="Captured"
                    borderRadius="lg"
                    maxH="400px"
                    w="full"
                    objectFit="contain"
                  />
                  
                  {isProcessing && (
                    <Flex
                      position="absolute"
                      top={0}
                      left={0}
                      right={0}
                      bottom={0}
                      bg="blackAlpha.700"
                      align="center"
                      justify="center"
                      borderRadius="lg"
                    >
                      <VStack>
                        <Spinner size="xl" color="white" />
                        <Text color="white">Analyzing image...</Text>
                        <Progress
                          size="xs"
                          isIndeterminate
                          w="200px"
                          colorScheme="blue"
                        />
                      </VStack>
                    </Flex>
                  )}
                </Box>

                {!isProcessing && detectedItems.length > 0 && (
                  <>
                    <Text fontWeight="bold">Detected Items:</Text>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={2} w="full">
                      {detectedItems.map((item, index) => (
                        <Flex
                          key={index}
                          p={3}
                          borderWidth={1}
                          borderRadius="md"
                          borderColor={item.selected ? 'blue.500' : borderColor}
                          bg={item.selected ? 'blue.50' : 'transparent'}
                          align="center"
                          justify="space-between"
                          cursor="pointer"
                          onClick={() => toggleItemSelection(index)}
                          _hover={{ bg: 'gray.50' }}
                        >
                          <VStack align="start" spacing={0}>
                            <Text fontWeight="medium">{item.name}</Text>
                            {item.quantity && (
                              <Text fontSize="sm" color="gray.600">
                                {item.quantity}
                              </Text>
                            )}
                            <HStack spacing={2}>
                              {item.category && (
                                <Badge size="sm">{item.category}</Badge>
                              )}
                              <Badge
                                colorScheme={
                                  item.confidence > 0.8
                                    ? 'green'
                                    : item.confidence > 0.6
                                    ? 'yellow'
                                    : 'red'
                                }
                                size="sm"
                              >
                                {Math.round(item.confidence * 100)}%
                              </Badge>
                            </HStack>
                          </VStack>
                          
                          <IconButton
                            icon={item.selected ? <CheckIcon /> : <CloseIcon />}
                            aria-label={item.selected ? 'Selected' : 'Not selected'}
                            size="sm"
                            colorScheme={item.selected ? 'blue' : 'gray'}
                            variant="ghost"
                          />
                        </Flex>
                      ))}
                    </SimpleGrid>
                  </>
                )}

                {!isProcessing && (
                  <HStack justify="center" spacing={4}>
                    <Button
                      leftIcon={<RepeatIcon />}
                      variant="outline"
                      onClick={retake}
                    >
                      Retake
                    </Button>
                    
                    {detectedItems.length > 0 && (
                      <Button
                        leftIcon={<CheckIcon />}
                        colorScheme="blue"
                        onClick={handleAddItems}
                      >
                        Add Selected Items
                      </Button>
                    )}
                  </HStack>
                )}
              </VStack>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default CameraCapture;