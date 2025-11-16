/**
 * Camera Scanning Component
 *
 * Main component for scanning pantry items with camera
 */

import React, { useState } from 'react';
import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  Alert,
  AlertIcon,
  Select,
  Spinner,
  useToast
} from '@chakra-ui/react';
import { useCamera } from '../../hooks/useCamera';
import { useScanning } from '../../hooks/useScanning';
import type { ScanMode } from '../../types/camera-scanning';

interface CameraScanningComponentProps {
  onItemsScanned?: (items: any[], scanResult: any) => void;
  onError?: (error: Error) => void;
  mode?: ScanMode;
  defaultProvider?: string;
  showProviderSelector?: boolean;
}

export function CameraScanningComponent({
  onItemsScanned,
  onError,
  mode = 'snapshot',
  defaultProvider = 'gemini-1.5-pro',
  showProviderSelector = false
}: CameraScanningComponentProps) {
  const toast = useToast();
  const [selectedProvider, setSelectedProvider] = useState(defaultProvider);

  const {
    videoRef,
    isActive: cameraActive,
    error: cameraError,
    devices,
    selectedDevice,
    setSelectedDevice,
    startCamera,
    stopCamera,
    captureFrame
  } = useCamera();

  const {
    isScanning,
    scanResult,
    duplicates,
    error: scanError,
    scanImage,
    reset
  } = useScanning();

  const handleStartCamera = async () => {
    await startCamera();
  };

  const handleStopCamera = () => {
    stopCamera();
    reset();
  };

  const handleCapture = async () => {
    try {
      const frame = await captureFrame();
      if (!frame) {
        throw new Error('Failed to capture frame');
      }

      const result = await scanImage(frame, {
        mode,
        provider: selectedProvider,
        extractNutrition: true,
        extractExpiry: true
      });

      if (result && onItemsScanned) {
        onItemsScanned(result.scanResult.detectedItems as any, result.scanResult);
      }

      if (result) {
        toast({
          title: 'Scan complete',
          description: `Detected ${result.scanResult.detectedItems.length} items`,
          status: 'success',
          duration: 3000
        });
      }
    } catch (error: any) {
      toast({
        title: 'Scan failed',
        description: error.message,
        status: 'error',
        duration: 5000
      });

      if (onError) {
        onError(error);
      }
    }
  };

  const error = cameraError || scanError;

  return (
    <Box>
      <VStack spacing={4} align="stretch">
        {/* Camera selection */}
        {devices.length > 1 && (
          <Select
            value={selectedDevice || ''}
            onChange={(e) => setSelectedDevice(e.target.value)}
            isDisabled={cameraActive}
          >
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </Select>
        )}

        {/* Provider selection (if enabled) */}
        {showProviderSelector && (
          <Select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
          >
            <option value="gemini-1.5-pro">Gemini 1.5 Pro (Balanced)</option>
            <option value="gemini-1.5-flash">Gemini 1.5 Flash (Fast & Cheap)</option>
            <option value="gpt-4-vision">GPT-4 Vision (Premium)</option>
            <option value="claude-3.5-sonnet">Claude 3.5 Sonnet (Premium)</option>
          </Select>
        )}

        {/* Error display */}
        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {/* Video feed */}
        <Box
          position="relative"
          bg="black"
          borderRadius="md"
          overflow="hidden"
          aspectRatio={16 / 9}
        >
          <video
            ref={videoRef}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
            autoPlay
            playsInline
            muted
          />

          {!cameraActive && (
            <Box
              position="absolute"
              top="50%"
              left="50%"
              transform="translate(-50%, -50%)"
              textAlign="center"
              color="white"
            >
              <Text fontSize="lg">Camera not started</Text>
            </Box>
          )}

          {isScanning && (
            <Box
              position="absolute"
              top="50%"
              left="50%"
              transform="translate(-50%, -50%)"
              bg="blackAlpha.700"
              p={4}
              borderRadius="md"
            >
              <VStack>
                <Spinner size="xl" color="white" />
                <Text color="white">Scanning...</Text>
              </VStack>
            </Box>
          )}
        </Box>

        {/* Controls */}
        <HStack spacing={3}>
          {!cameraActive ? (
            <Button
              colorScheme="blue"
              onClick={handleStartCamera}
              flex={1}
            >
              Start Camera
            </Button>
          ) : (
            <>
              <Button
                colorScheme="green"
                onClick={handleCapture}
                isLoading={isScanning}
                loadingText="Scanning..."
                isDisabled={!cameraActive || isScanning}
                flex={1}
              >
                Capture & Scan
              </Button>
              <Button
                colorScheme="red"
                onClick={handleStopCamera}
                variant="outline"
              >
                Stop
              </Button>
            </>
          )}
        </HStack>

        {/* Scan results preview */}
        {scanResult && (
          <Box
            p={4}
            borderWidth={1}
            borderRadius="md"
            borderColor="green.500"
          >
            <Text fontWeight="bold" mb={2}>
              Detected {scanResult.detectedItems.length} items
            </Text>
            <Text fontSize="sm" color="gray.600">
              Confidence: {((scanResult.confidence || 0) * 100).toFixed(0)}%
              • Time: {scanResult.processingTimeMs}ms
              • Cost: ${scanResult.cost?.toFixed(4)}
            </Text>

            {duplicates.length > 0 && (
              <Alert status="warning" mt={2}>
                <AlertIcon />
                {duplicates.length} possible duplicate{duplicates.length > 1 ? 's' : ''} detected
              </Alert>
            )}
          </Box>
        )}
      </VStack>
    </Box>
  );
}
