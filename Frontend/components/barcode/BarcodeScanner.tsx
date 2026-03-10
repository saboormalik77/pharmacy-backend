"use client";

import { useEffect, useRef, useState } from 'react';
import { X, Camera, ScanLine, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { BrowserMultiFormatReader } from '@zxing/library';

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export function BarcodeScanner({ onScan, onClose, isOpen }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const isScanningRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      // Initialize the barcode reader
      codeReaderRef.current = new BrowserMultiFormatReader();
      
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        startScanning();
      }, 200);

      return () => {
        clearTimeout(timer);
        stopScanning();
      };
    } else {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const startScanning = async () => {
    if (!videoRef.current || !codeReaderRef.current) {
      console.warn('Video ref or code reader not available');
      return;
    }

    try {
      setError(null);
      setScanning(false);
      isScanningRef.current = false;

      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Camera access is not supported in this browser. Please use a modern browser with camera support.');
        return;
      }

      const video = videoRef.current;
      isScanningRef.current = true;

      // Get available video input devices
      let deviceId: string | null = null;
      try {
        const videoInputDevices = await codeReaderRef.current.listVideoInputDevices();
        
        if (videoInputDevices.length > 0) {
          // Prefer back camera on mobile devices
          const backCamera = videoInputDevices.find(device => 
            device.label.toLowerCase().includes('back') || 
            device.label.toLowerCase().includes('rear') ||
            device.label.toLowerCase().includes('environment')
          );

          deviceId = backCamera?.deviceId || videoInputDevices[0]?.deviceId || null;
          console.log('📷 Using camera device:', deviceId || 'default');
        } else {
          console.log('📷 No devices found, using default camera');
        }
      } catch (listError) {
        console.warn('⚠️ Error listing devices, using default:', listError);
        // Continue with null deviceId (will use default)
      }

      // Set up video stream manually for better control
      const constraints: MediaStreamConstraints = {
        video: deviceId 
          ? { deviceId: { exact: deviceId } }
          : { 
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
      };

      console.log('📹 Requesting camera stream...');
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Set stream to video element
      video.srcObject = stream;
      
      // Wait for video to be ready and playing
      await new Promise<void>((resolve, reject) => {
        const onLoadedMetadata = () => {
          video.removeEventListener('loadedmetadata', onLoadedMetadata);
          video.removeEventListener('error', onError);
          
          video.play()
            .then(() => {
              console.log('📹 Video stream playing');
              resolve();
            })
            .catch(reject);
        };
        
        const onError = () => {
          video.removeEventListener('loadedmetadata', onLoadedMetadata);
          video.removeEventListener('error', onError);
          reject(new Error('Video failed to load'));
        };
        
        if (video.readyState >= 2) {
          // Video already loaded
          video.play()
            .then(() => resolve())
            .catch(reject);
        } else {
          video.addEventListener('loadedmetadata', onLoadedMetadata);
          video.addEventListener('error', onError);
        }
      });

      setScanning(true);
      console.log('🎥 Starting barcode detection...');
      
      // Use decodeFromVideoStream which works with an active stream
      // This is more reliable than decodeFromVideoDevice
      const decodeCallback = (result: any, err: any) => {
        if (!isScanningRef.current) {
          return;
        }

        if (result) {
          // Barcode found!
          const code = result.getText();
          console.log('✅ Barcode detected:', code);
          console.log('📊 Barcode format:', result.getBarcodeFormat());
          
          // Stop scanning first
          stopScanning();
          
          // Call the onScan callback
          setTimeout(() => {
            console.log('📤 Sending barcode to handler:', code);
            try {
              onScan(code);
            } catch (callbackError) {
              console.error('❌ Error in onScan callback:', callbackError);
            }
          }, 100);
          return;
        }
        
        if (err) {
          // NotFoundException is expected when no barcode is in view - this is normal
          if (err.name === 'NotFoundException') {
            // This is normal - no barcode in view yet, keep scanning
            return;
          }
          
          // Log other errors but don't stop scanning
          if (err.name !== 'NotFoundException') {
            console.warn('⚠️ Scanning error:', err.name, err.message || err);
          }
          
          // Only show error for critical issues
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            setError('Camera permission denied. Please allow camera access.');
            stopScanning();
          } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
            setError('Camera is already in use by another application.');
            stopScanning();
          }
        }
      };

      // Start continuous decoding from the video stream
      codeReaderRef.current.decodeFromStream(stream, video, decodeCallback);

      console.log('✅ Barcode detection started successfully');
    } catch (err: any) {
      console.error('❌ Error starting scanner:', err);
      setError(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Camera permission denied. Please allow camera access in your browser settings and try again.'
          : err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError'
          ? 'No camera found on this device. Please connect a camera and try again.'
          : err.name === 'NotReadableError' || err.name === 'TrackStartError'
          ? 'Camera is already in use by another application. Please close other apps using the camera.'
          : `Failed to access camera: ${err.message || 'Unknown error'}. Please try again.`
      );
      setScanning(false);
      isScanningRef.current = false;
    }
  };

  const stopScanning = () => {
    isScanningRef.current = false;
    
    if (codeReaderRef.current) {
      try {
        // Reset the code reader - this stops the scanning and releases the camera
        codeReaderRef.current.reset();
      } catch (err) {
        console.warn('Error resetting scanner:', err);
      }
    }

    // Stop all video tracks as a fallback
    if (videoRef.current) {
      if (videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => {
          track.stop();
          track.enabled = false;
        });
        videoRef.current.srcObject = null;
      }
      // Pause the video element
      videoRef.current.pause();
    }

    setScanning(false);
  };

  const handleRetry = () => {
    stopScanning();
    setTimeout(() => {
      startScanning();
    }, 100);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-teal-600" />
            <h3 className="font-bold text-lg">Barcode Scanner</h3>
          </div>
          <button
            onClick={() => {
              stopScanning();
              onClose();
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scanner Area */}
        <div className="p-4">
          {error ? (
            <div className="aspect-video bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center p-8">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <p className="text-sm text-red-600 text-center mb-4">{error}</p>
              <Button onClick={handleRetry} variant="outline" size="sm">
                <Camera className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </div>
          ) : (
            <div className="relative">
              <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  autoPlay
                  muted
                  // Don't mirror - barcodes need to be read in correct orientation
                />
                {/* Scanning Overlay */}
                {scanning && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative">
                      {/* Scanning Frame */}
                      <div className="w-64 h-64 border-4 border-teal-500 rounded-lg">
                        <div className="absolute top-0 left-0 w-full h-1 bg-teal-500 animate-pulse" />
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-teal-500 animate-pulse" />
                      </div>
                      {/* Corner Indicators */}
                      <div className="absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 border-teal-500 rounded-tl-lg" />
                      <div className="absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 border-teal-500 rounded-tr-lg" />
                      <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 border-teal-500 rounded-bl-lg" />
                      <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 border-teal-500 rounded-br-lg" />
                    </div>
                  </div>
                )}
                {/* Loading State */}
                {!scanning && !error && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="text-center">
                      <div className="animate-spin mb-2">
                        <Camera className="h-8 w-8 text-white mx-auto" />
                      </div>
                      <p className="text-sm text-white">Starting camera...</p>
                    </div>
                  </div>
                )}
                {/* Scanning in progress overlay */}
                {scanning && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                    <div className="bg-teal-500/90 text-white px-4 py-2 rounded-lg shadow-lg">
                      <div className="flex items-center gap-2">
                        <ScanLine className="h-5 w-5 animate-pulse" />
                        <span className="text-sm font-medium">Scanning for barcode...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Instructions */}
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-800 mb-2">
                  <strong>Instructions:</strong>
                </p>
                <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                  <li>Position the barcode within the scanning frame</li>
                  <li>Ensure good lighting and hold steady</li>
                  <li>The scanner will automatically detect barcodes</li>
                  <li>Keep the barcode in view until it's detected</li>
                </ul>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            {scanning ? (
              <Button
                disabled
                className="flex-1 bg-teal-600 hover:bg-teal-700"
              >
                <ScanLine className="mr-2 h-4 w-4 animate-pulse" />
                Scanning...
              </Button>
            ) : error ? (
              <Button
                onClick={handleRetry}
                className="flex-1 bg-teal-600 hover:bg-teal-700"
              >
                <Camera className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            ) : (
              <Button
                disabled
                className="flex-1 bg-gray-400"
              >
                <Camera className="mr-2 h-4 w-4" />
                Starting Camera...
              </Button>
            )}
            <Button
              onClick={() => {
                stopScanning();
                onClose();
              }}
              variant="outline"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
