import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from '@chakra-ui/react';

interface AIContextType {
  isAIEnabled: boolean;
  toggleAI: () => void;
  processCommand: (command: string) => Promise<CommandResult>;
  analyzeImage: (imageData: string | File) => Promise<ImageAnalysisResult>;
  suggestRecipes: (ingredients?: string[]) => Promise<RecipeSuggestion[]>;
  voiceEnabled: boolean;
  toggleVoice: () => void;
  isProcessing: boolean;
}

interface CommandResult {
  success: boolean;
  message: string;
  data?: any;
  actions?: string[];
}

interface ImageAnalysisResult {
  items: Array<{
    name: string;
    quantity?: string;
    category?: string;
    confidence: number;
  }>;
  success: boolean;
}

interface RecipeSuggestion {
  name: string;
  missingIngredients: string[];
  description: string;
  matchPercentage: number;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export const useAI = () => {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
};

interface AIProviderProps {
  children: ReactNode;
}

export const AIProvider: React.FC<AIProviderProps> = ({ children }) => {
  const [isAIEnabled, setIsAIEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();
  const toast = useToast();

  const toggleAI = useCallback(() => {
    setIsAIEnabled(prev => !prev);
    toast({
      title: isAIEnabled ? 'AI Assistant Disabled' : 'AI Assistant Enabled',
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
  }, [isAIEnabled, toast]);

  const toggleVoice = useCallback(() => {
    setVoiceEnabled(prev => !prev);
    if (!voiceEnabled && !('speechSynthesis' in window)) {
      toast({
        title: 'Voice not supported',
        description: 'Your browser does not support voice features',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    toast({
      title: voiceEnabled ? 'Voice Disabled' : 'Voice Enabled',
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
  }, [voiceEnabled, toast]);

  const processCommand = useCallback(async (command: string): Promise<CommandResult> => {
    if (!isAIEnabled) {
      return {
        success: false,
        message: 'AI features are disabled',
      };
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/ai/process-command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command,
          userId: user?.uid || 'anonymous',
        }),
      });

      const data = await response.json();
      
      if (data.success && voiceEnabled && 'speechSynthesis' in window) {
        // Speak the response
        const utterance = new SpeechSynthesisUtterance(data.message);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        speechSynthesis.speak(utterance);
      }

      return data;
    } catch (error) {
      console.error('Command processing error:', error);
      return {
        success: false,
        message: 'Failed to process command. Please try again.',
      };
    } finally {
      setIsProcessing(false);
    }
  }, [isAIEnabled, user, voiceEnabled]);

  const analyzeImage = useCallback(async (
    imageData: string | File
  ): Promise<ImageAnalysisResult> => {
    if (!isAIEnabled) {
      return {
        items: [],
        success: false,
      };
    }

    setIsProcessing(true);
    try {
      let base64Image: string;
      
      if (imageData instanceof File) {
        // Convert File to base64
        const reader = new FileReader();
        base64Image = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(imageData);
        });
      } else {
        base64Image = imageData;
      }

      const response = await fetch('/api/ai/vision/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Image,
          userId: user?.uid || 'anonymous',
          prompt: 'Identify all food items, ingredients, and groceries in this image',
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Image analyzed',
          description: `Found ${data.items.length} items`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        return {
          items: data.items,
          success: true,
        };
      } else {
        throw new Error(data.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Image analysis error:', error);
      toast({
        title: 'Analysis failed',
        description: 'Could not analyze the image. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return {
        items: [],
        success: false,
      };
    } finally {
      setIsProcessing(false);
    }
  }, [isAIEnabled, user, toast]);

  const suggestRecipes = useCallback(async (
    ingredients?: string[]
  ): Promise<RecipeSuggestion[]> => {
    if (!isAIEnabled) {
      return [];
    }

    setIsProcessing(true);
    try {
      // If no ingredients provided, fetch from pantry
      let ingredientList = ingredients;
      if (!ingredientList) {
        const pantryResponse = await fetch(`/api/pantry?userId=${user?.uid}`);
        const pantryData = await pantryResponse.json();
        ingredientList = pantryData.items?.map((item: any) => item.name) || [];
      }

      const response = await fetch('/api/ai/suggest-recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ingredients: ingredientList,
          userId: user?.uid || 'anonymous',
          maxRecipes: 5,
        }),
      });

      const data = await response.json();
      
      if (data.success && data.suggestions?.recipes) {
        return data.suggestions.recipes.map((recipe: any) => ({
          name: recipe.name,
          missingIngredients: recipe.missingIngredients || [],
          description: recipe.description || '',
          matchPercentage: recipe.matchPercentage || 0,
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Recipe suggestion error:', error);
      toast({
        title: 'Could not get suggestions',
        description: 'Failed to suggest recipes. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return [];
    } finally {
      setIsProcessing(false);
    }
  }, [isAIEnabled, user, toast]);

  const value: AIContextType = {
    isAIEnabled,
    toggleAI,
    processCommand,
    analyzeImage,
    suggestRecipes,
    voiceEnabled,
    toggleVoice,
    isProcessing,
  };

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
};

export default AIContext;