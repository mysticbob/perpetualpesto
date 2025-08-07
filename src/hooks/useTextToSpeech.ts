import { useState, useEffect, useCallback, useRef } from 'react';

interface TextToSpeechConfig {
  voice?: SpeechSynthesisVoice | null;
  rate?: number;
  pitch?: number;
  volume?: number;
  language?: string;
}

interface UseTextToSpeechReturn {
  speak: (text: string, config?: TextToSpeechConfig) => void;
  pause: () => void;
  resume: () => void;
  cancel: () => void;
  isSpeaking: boolean;
  isPaused: boolean;
  isSupported: boolean;
  voices: SpeechSynthesisVoice[];
  error: string | null;
}

export const useTextToSpeech = (
  defaultConfig?: TextToSpeechConfig
): UseTextToSpeechReturn => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  // Check if speech synthesis is supported
  const isSupported = typeof window !== 'undefined' && 
    'speechSynthesis' in window;

  // Load available voices
  useEffect(() => {
    if (!isSupported) {
      setError('Text-to-speech is not supported in this browser');
      return;
    }

    const loadVoices = () => {
      const availableVoices = speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    loadVoices();
    
    // Chrome loads voices asynchronously
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [isSupported]);

  const speak = useCallback((text: string, config?: TextToSpeechConfig) => {
    if (!isSupported) {
      setError('Text-to-speech is not available');
      return;
    }

    // Cancel any ongoing speech
    speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    const mergedConfig = { ...defaultConfig, ...config };
    
    // Apply configuration
    if (mergedConfig.voice) {
      utterance.voice = mergedConfig.voice;
    } else if (mergedConfig.language) {
      // Find a voice for the specified language
      const voice = voices.find(v => v.lang.startsWith(mergedConfig.language!));
      if (voice) {
        utterance.voice = voice;
      }
    }
    
    utterance.rate = mergedConfig.rate ?? 1.0;
    utterance.pitch = mergedConfig.pitch ?? 1.0;
    utterance.volume = mergedConfig.volume ?? 1.0;
    
    // Set up event handlers
    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
      setError(null);
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };
    
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setError(`Speech synthesis error: ${event.error}`);
      setIsSpeaking(false);
      setIsPaused(false);
    };
    
    utterance.onpause = () => {
      setIsPaused(true);
    };
    
    utterance.onresume = () => {
      setIsPaused(false);
    };
    
    utteranceRef.current = utterance;
    
    try {
      speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('Failed to speak:', err);
      setError('Failed to start speech synthesis');
      setIsSpeaking(false);
    }
  }, [isSupported, voices, defaultConfig]);

  const pause = useCallback(() => {
    if (isSupported && isSpeaking && !isPaused) {
      speechSynthesis.pause();
    }
  }, [isSupported, isSpeaking, isPaused]);

  const resume = useCallback(() => {
    if (isSupported && isSpeaking && isPaused) {
      speechSynthesis.resume();
    }
  }, [isSupported, isSpeaking, isPaused]);

  const cancel = useCallback(() => {
    if (isSupported) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
    }
  }, [isSupported]);

  return {
    speak,
    pause,
    resume,
    cancel,
    isSpeaking,
    isPaused,
    isSupported,
    voices,
    error,
  };
};

// Preset voice configurations for common use cases
export const VOICE_PRESETS = {
  assistant: {
    rate: 1.0,
    pitch: 1.0,
    volume: 0.9,
  },
  fast: {
    rate: 1.5,
    pitch: 1.0,
    volume: 1.0,
  },
  slow: {
    rate: 0.8,
    pitch: 1.0,
    volume: 1.0,
  },
  announcement: {
    rate: 0.9,
    pitch: 1.1,
    volume: 1.0,
  },
};

// Hook for auto-speaking messages
export const useAutoSpeak = (
  enabled: boolean = true,
  config?: TextToSpeechConfig
) => {
  const { speak, cancel, isSupported } = useTextToSpeech(config);
  const messageQueueRef = useRef<string[]>([]);
  const isProcessingRef = useRef(false);

  const queueMessage = useCallback((text: string) => {
    if (!enabled || !isSupported) return;
    
    messageQueueRef.current.push(text);
    processQueue();
  }, [enabled, isSupported]);

  const processQueue = useCallback(() => {
    if (isProcessingRef.current || messageQueueRef.current.length === 0) {
      return;
    }

    isProcessingRef.current = true;
    const message = messageQueueRef.current.shift();
    
    if (message) {
      speak(message);
      
      // Wait a bit before processing next message
      setTimeout(() => {
        isProcessingRef.current = false;
        processQueue();
      }, 500);
    } else {
      isProcessingRef.current = false;
    }
  }, [speak]);

  const clearQueue = useCallback(() => {
    messageQueueRef.current = [];
    cancel();
  }, [cancel]);

  return {
    queueMessage,
    clearQueue,
    isSupported,
  };
};