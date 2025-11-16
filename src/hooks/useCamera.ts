/**
 * useCamera Hook
 *
 * Manages camera access and video stream
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { captureFromVideo } from '../utils/image';

export function useCamera() {
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Get available camera devices
  const getDevices = useCallback(async () => {
    try {
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const cameras = deviceList.filter(d => d.kind === 'videoinput');
      setDevices(cameras);
      if (cameras.length > 0 && !selectedDevice) {
        setSelectedDevice(cameras[0].deviceId);
      }
    } catch (err: any) {
      setError('Failed to get camera devices: ' + err.message);
    }
  }, [selectedDevice]);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: selectedDevice ? { exact: selectedDevice } : undefined,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: selectedDevice ? undefined : 'environment' // Prefer back camera on mobile
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      streamRef.current = stream;
      setIsActive(true);
      setError(null);
    } catch (err: any) {
      setError('Failed to access camera: ' + err.message);
      setIsActive(false);
    }
  }, [selectedDevice]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
  }, []);

  // Capture frame from video
  const captureFrame = useCallback(async (): Promise<Blob | null> => {
    if (!videoRef.current || !isActive) return null;

    try {
      return await captureFromVideo(videoRef.current);
    } catch (err: any) {
      setError('Failed to capture frame: ' + err.message);
      return null;
    }
  }, [isActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Get devices on mount
  useEffect(() => {
    getDevices();
  }, [getDevices]);

  return {
    videoRef,
    isActive,
    error,
    devices,
    selectedDevice,
    setSelectedDevice,
    startCamera,
    stopCamera,
    captureFrame
  };
}
