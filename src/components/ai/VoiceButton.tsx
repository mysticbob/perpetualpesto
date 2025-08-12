import React, { useEffect, useState } from 'react';
import {
  IconButton,
  Box,
  Text,
  VStack,
  Fade,
  useColorModeValue,
  Tooltip,
  Badge,
  keyframes,
} from '@chakra-ui/react';
import { FaMicrophone, FaMicrophoneSlash, FaVolumeUp, FaVolumeMute } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import { useTextToSpeech, VOICE_PRESETS } from '../../hooks/useTextToSpeech';

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  speakResponse?: boolean;
  disabled?: boolean;
}

const pulseAnimation = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(66, 153, 225, 0.6);
  }
  70% {
    box-shadow: 0 0 0 20px rgba(66, 153, 225, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(66, 153, 225, 0);
  }
`;

const VoiceButton: React.FC<VoiceButtonProps> = ({
  onTranscript,
  speakResponse = true,
  disabled = false,
}) => {
  const [showTranscript, setShowTranscript] = useState(false);
  const [lastCommand, setLastCommand] = useState('');
  
  const {
    transcript,
    interimTranscript,
    isListening,
    isSupported: isSpeechSupported,
    startListening,
    stopListening,
    resetTranscript,
    error: speechError,
  } = useSpeechRecognition({
    continuous: false,
    interimResults: true,
    language: 'en-US',
  });

  const {
    speak,
    cancel: cancelSpeech,
    isSpeaking,
    isSupported: isTTSSupported,
    voices,
  } = useTextToSpeech(VOICE_PRESETS.assistant);

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const transcriptBg = useColorModeValue('gray.50', 'gray.900');

  // Find the best voice for the assistant
  useEffect(() => {
    if (voices.length > 0) {
      // Prefer a female voice for the assistant
      const preferredVoice = voices.find(
        v => v.lang.startsWith('en') && v.name.includes('Female')
      ) || voices.find(v => v.lang.startsWith('en'));
      
      if (preferredVoice) {
        // Voice will be set in the speak function
      }
    }
  }, [voices]);

  // Handle transcript updates
  useEffect(() => {
    if (transcript && transcript !== lastCommand) {
      onTranscript(transcript);
      setLastCommand(transcript);
      resetTranscript();
      setShowTranscript(false);
    }
  }, [transcript, lastCommand, onTranscript, resetTranscript]);

  // Show interim transcript
  useEffect(() => {
    if (interimTranscript) {
      setShowTranscript(true);
    } else if (!isListening) {
      setTimeout(() => setShowTranscript(false), 1000);
    }
  }, [interimTranscript, isListening]);

  const handleToggleListening = () => {
    if (disabled) return;
    
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
  };

  const handleToggleSpeaking = () => {
    if (isSpeaking) {
      cancelSpeech();
    }
  };

  // Auto-speak responses
  const speakText = (text: string) => {
    if (speakResponse && isTTSSupported) {
      speak(text);
    }
  };

  if (!isSpeechSupported) {
    return (
      <Tooltip label="Voice input not supported in this browser">
        <IconButton
          icon={<FaMicrophoneSlash />}
          aria-label="Voice not supported"
          isDisabled
          variant="ghost"
        />
      </Tooltip>
    );
  }

  return (
    <Box position="relative">
      {/* Transcript Display */}
      <Fade in={showTranscript}>
        <Box
          position="absolute"
          bottom="60px"
          left="50%"
          transform="translateX(-50%)"
          bg={transcriptBg}
          border="1px solid"
          borderColor={borderColor}
          borderRadius="lg"
          px={4}
          py={2}
          minW="200px"
          maxW="300px"
          shadow="lg"
          zIndex={10}
        >
          <VStack spacing={1} align="start">
            <Badge colorScheme="blue" fontSize="xs">
              {isListening ? 'Listening...' : 'Processing...'}
            </Badge>
            <Text fontSize="sm" fontStyle={interimTranscript ? 'italic' : 'normal'}>
              {interimTranscript || transcript || 'Say something...'}
            </Text>
          </VStack>
        </Box>
      </Fade>

      {/* Voice Button */}
      <Box position="relative" display="inline-block">
        <IconButton
          as={motion.button}
          icon={isListening ? <FaMicrophone /> : <FaMicrophone />}
          aria-label={isListening ? 'Stop listening' : 'Start listening'}
          colorScheme={isListening ? 'red' : 'blue'}
          size="lg"
          isRound
          onClick={handleToggleListening}
          isDisabled={disabled}
          animation={isListening ? `${pulseAnimation} 2s infinite` : undefined}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        />
        
        {/* Listening Indicator */}
        {isListening && (
          <Box
            position="absolute"
            top="50%"
            left="50%"
            transform="translate(-50%, -50%)"
            pointerEvents="none"
          >
            <Box
              as={motion.div}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.6, 0.2, 0.6],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              w="60px"
              h="60px"
              borderRadius="full"
              border="3px solid"
              borderColor="red.500"
            />
          </Box>
        )}

        {/* Speaking Indicator */}
        {isSpeaking && (
          <Box
            position="absolute"
            top="-5px"
            right="-5px"
            bg="green.500"
            borderRadius="full"
            p={1}
          >
            <FaVolumeUp size={12} color="white" />
          </Box>
        )}
      </Box>

      {/* Error Display */}
      {speechError && (
        <Box
          position="absolute"
          top="-40px"
          left="50%"
          transform="translateX(-50%)"
          bg="red.500"
          color="white"
          px={3}
          py={1}
          borderRadius="md"
          fontSize="xs"
          whiteSpace="nowrap"
        >
          {speechError}
        </Box>
      )}
    </Box>
  );
};

export default VoiceButton;