/**
 * useScanning Hook
 *
 * Manages scanning API calls and state
 */

import { useState, useCallback } from 'react';
import { fileToBase64 } from '../utils/image';
import type { DetectedItem, ScanResult, ScanOptions, DuplicateMatch } from '../types/camera-scanning';

export function useScanning() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const scanImage = useCallback(async (
    imageBlob: Blob,
    options: ScanOptions
  ): Promise<{ scanResult: ScanResult; duplicates: DuplicateMatch[] } | null> => {
    setIsScanning(true);
    setError(null);

    try {
      // Convert blob to base64
      const base64 = await fileToBase64(imageBlob);

      // Call API
      const response = await fetch('/api/scanning/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include auth cookies
        body: JSON.stringify({
          image: base64,
          options,
          sessionId
        })
      });

      if (!response.ok) {
        throw new Error(`Scan failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Scan failed');
      }

      const result = data.data.scanResult;
      const dups = data.data.duplicates || [];

      setScanResult(result);
      setDuplicates(dups);

      // Store session ID for subsequent scans
      if (result.sessionId && !sessionId) {
        setSessionId(result.sessionId);
      }

      return { scanResult: result, duplicates: dups };

    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return null;
    } finally {
      setIsScanning(false);
    }
  }, [sessionId]);

  const reset = useCallback(() => {
    setScanResult(null);
    setDuplicates([]);
    setError(null);
    setIsScanning(false);
  }, []);

  const startNewSession = useCallback(() => {
    setSessionId(null);
    reset();
  }, [reset]);

  const completeSession = useCallback(async () => {
    if (!sessionId) return;

    try {
      await fetch(`/api/scanning/session/${sessionId}/complete`, {
        method: 'POST',
        credentials: 'include'
      });

      startNewSession();
    } catch (err) {
      console.error('Failed to complete session:', err);
    }
  }, [sessionId, startNewSession]);

  const addItemsToPantry = useCallback(async (
    items: Array<{
      detectedItem: DetectedItem;
      locationId: string;
      userEdits?: Partial<DetectedItem>;
    }>
  ) => {
    if (!scanResult) {
      throw new Error('No scan result to add');
    }

    const response = await fetch('/api/scanning/add-items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        scanResultId: scanResult.id,
        items
      })
    });

    if (!response.ok) {
      throw new Error('Failed to add items');
    }

    const data = await response.json();
    return data.data;
  }, [scanResult]);

  const submitFeedback = useCallback(async (
    feedbackType: 'THUMBS_UP' | 'THUMBS_DOWN' | 'CORRECTION',
    options?: {
      itemIndex?: number;
      incorrectValue?: Partial<DetectedItem>;
      correctValue?: Partial<DetectedItem>;
      comment?: string;
    }
  ) => {
    if (!scanResult) return;

    await fetch('/api/scanning/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        scanResultId: scanResult.id,
        feedbackType,
        ...options
      })
    });
  }, [scanResult]);

  return {
    isScanning,
    scanResult,
    duplicates,
    error,
    sessionId,
    scanImage,
    reset,
    startNewSession,
    completeSession,
    addItemsToPantry,
    submitFeedback
  };
}
