'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Camera, Loader2, AlertCircle } from 'lucide-react';

interface QrScannerModalProps {
    onScan: (data: string) => void;
    onClose: () => void;
}

type ScannerStatus = 'requesting' | 'active' | 'error';

export default function QrScannerModal({ onScan, onClose }: QrScannerModalProps) {
    const [status, setStatus] = useState<ScannerStatus>('requesting');
    const [errorMsg, setErrorMsg] = useState('');
    const scannerRef = useRef<any>(null);
    const scannedRef = useRef(false);
    const mountedRef = useRef(true);

    const stopScanner = useCallback(async () => {
        if (scannerRef.current) {
            try {
                const state = scannerRef.current.getState?.();
                if (state === 2 || state === 3) {
                    await scannerRef.current.stop();
                }
            } catch {
                // already stopped
            }
            scannerRef.current = null;
        }
    }, []);

    useEffect(() => {
        mountedRef.current = true;

        const startScanner = async () => {
            try {
                const { Html5Qrcode } = await import('html5-qrcode');

                // Container div must already be in the DOM at this point
                const scanner = new Html5Qrcode('qr-reader-container');
                scannerRef.current = scanner;

                await scanner.start(
                    { facingMode: 'environment' },
                    {
                        fps: 15,
                        qrbox: { width: 260, height: 260 },
                        aspectRatio: 1.333,
                    },
                    (decodedText: string) => {
                        if (scannedRef.current) return;
                        scannedRef.current = true;

                        setTimeout(async () => {
                            if (!mountedRef.current) return;
                            await stopScanner();
                            onScan(decodedText);
                        }, 200);
                    },
                    () => {
                        // per-frame errors — ignore
                    }
                );

                if (mountedRef.current) setStatus('active');
            } catch (err: any) {
                if (!mountedRef.current) return;
                const msg: string = err?.message || String(err);
                if (/permission|denied/i.test(msg)) {
                    setErrorMsg('Camera permission denied. Please allow camera access in your browser settings and try again.');
                } else if (/notfound|no device|no camera/i.test(msg)) {
                    setErrorMsg('No camera found on this device.');
                } else {
                    setErrorMsg(msg || 'Failed to start camera.');
                }
                setStatus('error');
            }
        };

        startScanner();

        return () => {
            mountedRef.current = false;
            stopScanner();
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div
            className="fixed inset-0 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl w-full max-w-sm shadow-2xl flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
                    <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Camera className="w-5 h-5 text-green-600" />
                        Scan QR / Barcode
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded-lg hover:bg-gray-100"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 flex flex-col">

                    {/* ── Error state ── */}
                    {status === 'error' && (
                        <div className="flex flex-col items-center justify-center py-10 px-6 gap-4 text-center">
                            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                                <AlertCircle className="w-7 h-7 text-red-500" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-red-700">Camera unavailable</p>
                                <p className="text-xs text-gray-500 mt-1">{errorMsg}</p>
                            </div>
                            <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                                Use USB scanner input or Manual NDC entry instead.
                            </p>
                        </div>
                    )}

                    {/* ── Camera container — always rendered so html5-qrcode can inject video ── */}
                    {status !== 'error' && (
                        <div className="relative">
                            {/* Loading overlay — sits on top of the (empty) camera container */}
                            {status === 'requesting' && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-50 z-10" style={{ minHeight: 320 }}>
                                    <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center">
                                        <Loader2 className="w-7 h-7 animate-spin text-primary-600" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-700">Starting camera...</p>
                                    <p className="text-xs text-gray-400">Allow camera access when prompted</p>
                                </div>
                            )}

                            {/* html5-qrcode MUST render into this div — never hidden or display:none */}
                            <div
                                id="qr-reader-container"
                                style={{ width: '100%', minHeight: 320 }}
                            />
                        </div>
                    )}

                    {/* Hint below camera */}
                    {status === 'active' && (
                        <p className="text-xs text-center text-gray-400 px-4 py-2 border-t border-gray-100">
                            Point camera at the QR code or barcode on the bottle
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-gray-100 flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="w-full py-2 text-sm text-gray-500 hover:text-gray-800 transition-colors font-medium rounded-lg hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
