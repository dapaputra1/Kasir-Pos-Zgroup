import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  Camera,
  X,
  AlertCircle,
  RefreshCw,
  Upload,
  Zap,
  ZapOff,
  Keyboard,
  ArrowRight,
  Info,
} from 'lucide-react';
import { sound } from '../../lib/sound';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => void;
  title?: string;
  scannerId?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Scan Barcode Produk',
  scannerId = 'grosirpos-barcode-reader',
}) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [manualCode, setManualCode] = useState('');

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const elementId = scannerId;

  // Initialize and enumerate cameras
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsInitializing(true);
    setErrorMessage(null);
    setTorchOn(false);
    setHasTorch(false);

    const initScanner = async () => {
      try {
        // Formats supported for grocery retail barcodes & QR
        const formatsToSupport = [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.UPC_EAN_EXTENSION,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
        ];

        // Enable native hardware BarcodeDetector API for 10x faster & reliable scanning
        const html5QrCode = new Html5Qrcode(elementId, {
          formatsToSupport,
          verbose: false,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
        });
        scannerRef.current = html5QrCode;

        // Discover available cameras
        let availableDevices: Array<{ id: string; label: string }> = [];
        try {
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            availableDevices = devices;
            if (isMounted) setCameras(devices);
          }
        } catch (camErr) {
          console.warn('Error querying camera devices:', camErr);
        }

        // Determine camera target (prefer back/rear camera on mobile/tablet)
        let cameraTarget: any = { facingMode: 'environment' };
        if (availableDevices.length > 0) {
          const backCam = availableDevices.find((d) =>
            /back|rear|environment|belakang/i.test(d.label)
          );
          const chosen = backCam ? backCam.id : availableDevices[0].id;
          if (isMounted) setSelectedCameraId(chosen);
          cameraTarget = chosen;
        }

        const config = {
          fps: 20, // Increased frame rate for fast detection
          // Dynamic responsive qrbox: wide area suited for 1D retail barcodes
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const width = Math.min(viewfinderWidth - 12, Math.floor(viewfinderWidth * 0.95));
            const height = Math.min(viewfinderHeight - 12, Math.floor(viewfinderHeight * 0.65));
            return {
              width: Math.max(width, 220),
              height: Math.max(height, 130),
            };
          },
          aspectRatio: 1.333333,
          videoConstraints: {
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 },
          },
        };

        await html5QrCode.start(
          cameraTarget,
          config,
          (decodedText) => {
            if (isMounted) {
              sound.playScanSuccess();
              if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
              onScan(decodedText);
            }
          },
          () => {
            // Frame scanned with no barcode detected - keep quiet
          }
        );

        // Check if torch/flashlight is supported
        try {
          const capabilities: any = html5QrCode.getRunningTrackCapabilities();
          if (capabilities && capabilities.torch) {
            if (isMounted) setHasTorch(true);
          }
        } catch {
          // torch check fallback
        }

        if (isMounted) {
          setIsInitializing(false);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Camera scanner start error:', err);
          setIsInitializing(false);
          setErrorMessage(
            err.message || 'Tidak dapat mengakses kamera. Pastikan izin kamera browser telah diaktifkan.'
          );
          sound.playScanError();
        }
      }
    };

    // Small delay to ensure modal DOM is mounted
    const timeout = setTimeout(() => {
      initScanner();
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current
            .stop()
            .then(() => {
              scannerRef.current?.clear();
            })
            .catch((e) => console.error('Error stopping scanner:', e));
        }
      }
    };
  }, [isOpen]);

  // Handle switching camera
  const handleCameraChange = async (newCameraId: string) => {
    setSelectedCameraId(newCameraId);
    if (!scannerRef.current) return;

    try {
      setIsInitializing(true);
      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }

      const config = {
        fps: 20,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const width = Math.min(viewfinderWidth - 12, Math.floor(viewfinderWidth * 0.95));
          const height = Math.min(viewfinderHeight - 12, Math.floor(viewfinderHeight * 0.65));
          return {
            width: Math.max(width, 220),
            height: Math.max(height, 130),
          };
        },
        aspectRatio: 1.333333,
      };

      await scannerRef.current.start(
        newCameraId,
        config,
        (decodedText) => {
          sound.playScanSuccess();
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
          onScan(decodedText);
        },
        () => {}
      );
      setIsInitializing(false);
    } catch (err: any) {
      console.error('Failed to switch camera:', err);
      setIsInitializing(false);
      setErrorMessage('Gagal mengganti kamera. Coba kamera lain atau gunakan input manual.');
    }
  };

  // Toggle Torch/Flashlight
  const handleToggleTorch = async () => {
    if (!scannerRef.current) return;
    try {
      const nextTorch = !torchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch } as any],
      });
      setTorchOn(nextTorch);
    } catch (e) {
      console.warn('Torch toggle not supported', e);
    }
  };

  // Handle photo/image upload
  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !scannerRef.current) return;

    setIsProcessingFile(true);
    setErrorMessage(null);
    try {
      const decoded = await scannerRef.current.scanFile(file, true);
      sound.playScanSuccess();
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      onScan(decoded);
    } catch (err: any) {
      sound.playScanError();
      setErrorMessage(
        'Barcode tidak terdeteksi pada gambar. Pastikan foto cukup terang, tidak buram, dan barcode tidak terpotong.'
      );
    } finally {
      setIsProcessingFile(false);
      if (e.target) e.target.value = '';
    }
  };

  // Handle manual input submission / scanner gun Enter
  const handleManualSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = manualCode.trim();
    if (!clean) return;
    sound.playScanSuccess();
    onScan(clean);
    setManualCode('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/75 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-surface-border z-10 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-surface-border flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink">{title}</h3>
              <p className="text-[11px] text-ink-muted">
                Deteksi otomatis EAN-13, EAN-8, Code-128, QR Code & input manual
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-ink-muted hover:text-ink hover:bg-surface-subtle rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder Video Area */}
        <div className="p-4 bg-slate-950 flex flex-col items-center justify-center relative min-h-[300px]">
          {errorMessage ? (
            <div className="p-4 bg-rose-950/80 border border-rose-500/50 rounded-xl text-rose-200 text-xs space-y-2 max-w-sm text-center">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
              <p className="font-semibold text-white">{errorMessage}</p>
              <p className="text-[11px] text-rose-300">
                Anda juga dapat memilih foto barcode kemasan atau mengetikkan kode secara langsung di bawah.
              </p>
            </div>
          ) : (
            <div className="relative w-full overflow-hidden rounded-xl bg-black flex items-center justify-center border border-white/10 shadow-inner">
              <div id={elementId} className="w-full" />

              {/* Laser Line Scanning Animation */}
              {!isInitializing && (
                <div className="absolute inset-x-8 pointer-events-none top-1/2 -translate-y-1/2 flex flex-col items-center">
                  <div className="w-full h-0.5 bg-rose-500 shadow-[0_0_12px_3px_rgba(244,63,94,0.9)] animate-pulse" />
                  <span className="text-[10px] text-white/80 bg-black/60 px-2.5 py-0.5 rounded-full mt-2 font-mono tracking-wider backdrop-blur-xs">
                    Posisikan Garis Barcode di Garis Merah
                  </span>
                </div>
              )}

              {/* Initializing / Loading Spinner */}
              {(isInitializing || isProcessingFile) && (
                <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center text-white text-xs gap-2.5">
                  <RefreshCw className="w-7 h-7 animate-spin text-brand-400" />
                  <span className="font-medium">
                    {isProcessingFile ? 'Menganalisis foto barcode...' : 'Mengaktifkan sensor kamera...'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Camera controls toolbar (Camera selector & Torch) */}
          <div className="w-full flex items-center justify-between gap-2 mt-3 text-white text-xs">
            {cameras.length > 1 ? (
              <div className="flex items-center gap-1.5 flex-1 max-w-[240px]">
                <select
                  value={selectedCameraId}
                  onChange={(e) => handleCameraChange(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  {cameras.map((c, idx) => (
                    <option key={c.id} value={c.id}>
                      {c.label || `Kamera ${idx + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <span className="text-[11px] text-slate-400">Sensor kamera aktif</span>
            )}

            <div className="flex items-center gap-2">
              {/* Torch button if supported */}
              {hasTorch && (
                <button
                  type="button"
                  onClick={handleToggleTorch}
                  className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    torchOn ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                  title="Flashlight / Lampu Kamera"
                >
                  {torchOn ? <ZapOff className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                  <span>{torchOn ? 'Matikan Lampu' : 'Nyalakan Lampu'}</span>
                </button>
              )}

              {/* Upload Image Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingFile}
                className="p-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition"
                title="Pilih foto barcode dari galeri/kamera"
              >
                <Upload className="w-4 h-4 text-brand-400" />
                <span>Foto Barcode</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileScan}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Manual Barcode Input / Barcode Gun Tembak */}
        <div className="p-4 bg-white border-t border-surface-border space-y-3 shrink-0">
          <form onSubmit={handleManualSubmit} className="space-y-1.5">
            <label className="flex items-center justify-between text-xs font-bold text-ink">
              <span className="flex items-center gap-1.5">
                <Keyboard className="w-3.5 h-3.5 text-brand-600" />
                <span>Ketik Barcode atau Tembak Scanner USB/Bluetooth:</span>
              </span>
              <span className="text-[11px] font-normal text-ink-muted">Tekan Enter untuk input</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Contoh: 8992388112019..."
                autoFocus
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-surface-border text-ink font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-sm"
              >
                <span>Terapkan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          {/* Quick Guidance Tips */}
          <div className="bg-brand-50/60 border border-brand-100 rounded-lg p-2.5 text-[11px] text-brand-900 flex items-start gap-2">
            <Info className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
            <div>
              <strong>Tips Scan Cepat:</strong> Jaga jarak kamera sekitar 10–20 cm dari barcode. Pastikan kemasan tidak memantulkan cahaya lampu langsung. Untuk scanner tembak (USB/Bluetooth), Anda dapat langsung scan ke input di atas.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
