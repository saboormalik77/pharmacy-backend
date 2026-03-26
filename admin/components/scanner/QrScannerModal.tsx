'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Camera, Loader2, AlertCircle } from 'lucide-react';

interface QrScannerModalProps {
    onScan: (data: string) => void;
    onClose: () => void;
}

type ScannerStatus = 'requesting' | 'active' | 'error';

// Safe client-side check (this component is dynamic-imported with ssr:false)
const hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;

export default function QrScannerModal({ onScan, onClose }: QrScannerModalProps) {
    const [status, setStatus] = useState<ScannerStatus>('requesting');
    const [errorMsg, setErrorMsg] = useState('');

    // Native path refs (BarcodeDetector)
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const rafRef = useRef<number>(0);

    // html5-qrcode fallback ref
    const scannerRef = useRef<any>(null);

    const scannedRef = useRef(false);

    // ── Stop helpers ──────────────────────────────────────────

    // Synchronously stops the native getUserMedia stream + rAF loop.
    const stopNative = () => {
        if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
        if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
        if (videoRef.current) { videoRef.current.srcObject = null; }
    };

    // Synchronously stops any video tracks injected by html5-qrcode,
    // then fires the async scanner.stop() in the background.
    const stopFallback = () => {
        // Sync: kill the camera tracks directly on the DOM video element
        const container = document.getElementById('qr-fallback-container');
        if (container) {
            container.querySelectorAll('video').forEach(video => {
                const s = video.srcObject as MediaStream | null;
                if (s) { s.getTracks().forEach(t => t.stop()); video.srcObject = null; }
            });
        }
        // Async: let html5-qrcode clean up its own state
        if (scannerRef.current) {
            const sc = scannerRef.current;
            scannerRef.current = null;
            try {
                const state = sc.getState?.();
                if (state === 2 || state === 3) sc.stop().catch(() => {});
            } catch {}
        }
    };

    // ── Effect ────────────────────────────────────────────────

    useEffect(() => {
        // `cancelled` is local to this effect invocation.
        // React 18 Strict Mode double-mounts: cleanup1 sets cancelled1=true before
        // run2 starts, so any async callbacks from run1 see cancelled1=true and exit.
        // This prevents html5-qrcode from being created twice on the same DOM node.
        let cancelled = false;
        scannedRef.current = false;

        // Stop camera immediately when the page hides (navigation, logout, tab switch).
        // This prevents "RenderedCameraImpl video surface onabort()" console errors
        // that appear when the browser navigates while a live MediaStream is attached.
        const handleHide = () => {
            cancelled = true;
            stopNative();
            stopFallback();
        };
        document.addEventListener('visibilitychange', handleHide);
        window.addEventListener('pagehide', handleHide);

        const start = async () => {
            try {
                if (hasBarcodeDetector) {
                    // ── PRIMARY: native getUserMedia + BarcodeDetector ──────────
                    const stream = await navigator.mediaDevices.getUserMedia({
                        video: { facingMode: 'environment' },
                    });
                    if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

                    streamRef.current = stream;
                    const video = videoRef.current;
                    if (!video) { stream.getTracks().forEach(t => t.stop()); return; }
                    video.srcObject = stream;
                    await video.play();
                    if (cancelled) { stopNative(); return; }
                    setStatus('active');

                    const detector = new (window as any).BarcodeDetector({
                        formats: [
                            'qr_code',
                            'code_128', 'code_39', 'code_93',
                            'ean_13', 'ean_8',
                            'upc_a', 'upc_e',
                            'data_matrix', 'pdf417', 'aztec', 'itf',
                        ],
                    });

                    const tick = async () => {
                        if (cancelled || scannedRef.current || !video) return;
                        if (video.readyState >= video.HAVE_ENOUGH_DATA) {
                            try {
                                const results = await detector.detect(video);
                                if (results.length > 0 && !scannedRef.current && !cancelled) {
                                    scannedRef.current = true;
                                    stopNative();
                                    onScan(results[0].rawValue);
                                    return;
                                }
                            } catch { /* per-frame errors — ignore */ }
                        }
                        rafRef.current = requestAnimationFrame(tick);
                    };
                    rafRef.current = requestAnimationFrame(tick);

                } else {
                    // ── FALLBACK: html5-qrcode ──────────────────────────────────
                    const { Html5Qrcode } = await import('html5-qrcode');
                    if (cancelled) return;

                    // Enumerate cameras and pick back-facing one by device ID.
                    // Passing a specific ID prevents html5-qrcode injecting a
                    // camera-selection dropdown inside the container.
                    let cameraId: string | { facingMode: string } = { facingMode: 'environment' };
                    try {
                        const cameras = await Html5Qrcode.getCameras();
                        if (cameras?.length > 0) {
                            const back = cameras.find(c => /back|rear|environment/i.test(c.label));
                            cameraId = (back ?? cameras[cameras.length - 1]).id;
                        }
                    } catch {}
                    if (cancelled) return;

                    const scanner = new Html5Qrcode('qr-fallback-container');
                    scannerRef.current = scanner;

                    await scanner.start(
                        cameraId,
                        { fps: 15, qrbox: { width: 260, height: 260 }, aspectRatio: 1.333 },
                        (decodedText: string) => {
                            if (scannedRef.current || cancelled) return;
                            scannedRef.current = true;
                            stopFallback();
                            if (!cancelled) onScan(decodedText);
                        },
                        () => { /* per-frame errors — ignore */ }
                    );
                    if (cancelled) { stopFallback(); return; }
                    setStatus('active');
                }

            } catch (err: any) {
                if (cancelled) return;
                const msg: string = err?.message || String(err);
                if (/permission|denied/i.test(msg)) {
                    setErrorMsg('Camera permission denied. Allow camera access in your browser settings and try again.');
                } else if (/notfound|no device|no camera/i.test(msg)) {
                    setErrorMsg('No camera found on this device.');
                } else {
                    setErrorMsg(msg || 'Failed to start camera.');
                }
                setStatus('error');
            }
        };

        start();

        return () => {
            cancelled = true;
            document.removeEventListener('visibilitychange', handleHide);
            window.removeEventListener('pagehide', handleHide);
            stopNative();
            stopFallback();
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Render ────────────────────────────────────────────────

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

                    {/* Error state */}
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

                    {/* Camera view */}
                    {status !== 'error' && (
                        <div className="relative" style={{ minHeight: 320 }}>

                            {/* Loading overlay */}
                            {status === 'requesting' && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-50 z-10">
                                    <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center">
                                        <Loader2 className="w-7 h-7 animate-spin text-primary-600" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-700">Starting camera...</p>
                                    <p className="text-xs text-gray-400">Allow camera access when prompted</p>
                                </div>
                            )}

                            {hasBarcodeDetector ? (
                                // Native video element — library injects nothing here
                                <>
                                    <video
                                        ref={videoRef}
                                        muted
                                        playsInline
                                        className="w-full block"
                                        style={{
                                            minHeight: 320,
                                            objectFit: 'cover',
                                            visibility: status === 'active' ? 'visible' : 'hidden',
                                        }}
                                    />
                                    {status === 'active' && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <div className="relative w-52 h-52">
                                                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-400" />
                                                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-400" />
                                                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-400" />
                                                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-400" />
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                // html5-qrcode fallback — must be in the DOM before the effect runs
                                <div
                                    id="qr-fallback-container"
                                    style={{ width: '100%', minHeight: 320 }}
                                />
                            )}
                        </div>
                    )}

                    {/* Hint */}
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
