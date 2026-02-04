import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, Keyboard, ScanLine, AlertCircle } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (code: string, format?: string) => void;
  onClose?: () => void;
  placeholder?: string;
  allowManualEntry?: boolean;
  formats?: Html5QrcodeSupportedFormats[];
}

export default function BarcodeScanner({
  onScan,
  onClose,
  placeholder = 'Scan barcode or enter manually...',
  allowManualEntry = true,
  formats = [
    Html5QrcodeSupportedFormats.QR_CODE,
    Html5QrcodeSupportedFormats.EAN_13,
    Html5QrcodeSupportedFormats.EAN_8,
    Html5QrcodeSupportedFormats.CODE_128,
    Html5QrcodeSupportedFormats.CODE_39,
    Html5QrcodeSupportedFormats.UPC_A,
    Html5QrcodeSupportedFormats.UPC_E,
  ],
}: BarcodeScannerProps) {
  const [mode, setMode] = useState<'camera' | 'manual'>('manual');
  const [manualInput, setManualInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const stopScanning = useCallback(async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {
        console.error('Error stopping scanner:', e);
      }
      setIsScanning(false);
    }
  }, [isScanning]);

  const startScanning = useCallback(async () => {
    if (!scannerContainerRef.current) return;

    try {
      setError(null);
      const html5QrCode = new Html5Qrcode('barcode-scanner-container');
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
        },
        (decodedText, decodedResult) => {
          onScan(decodedText, decodedResult.result.format?.formatName);
          stopScanning();
          if (onClose) onClose();
        },
        () => {}
      );
      setIsScanning(true);
    } catch (err: any) {
      console.error('Scanner error:', err);
      setError(err?.message || 'Failed to start camera. Please check permissions.');
      setMode('manual');
    }
  }, [formats, onScan, onClose, stopScanning]);

  useEffect(() => {
    if (mode === 'camera') {
      startScanning();
    } else {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
  }, [mode]);

  useEffect(() => {
    if (mode === 'manual' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [mode]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      onScan(manualInput.trim(), 'MANUAL');
      setManualInput('');
      if (onClose) onClose();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && manualInput.trim()) {
      onScan(manualInput.trim(), 'MANUAL');
      setManualInput('');
      if (onClose) onClose();
    }
  };

  return (
    <div style={{
      background: 'var(--bg-primary)',
      borderRadius: '12px',
      border: '1px solid var(--border)',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setMode('manual')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              background: mode === 'manual' ? 'var(--primary)' : 'transparent',
              color: mode === 'manual' ? 'white' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            <Keyboard size={16} />
            Manual
          </button>
          <button
            onClick={() => setMode('camera')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              border: 'none',
              background: mode === 'camera' ? 'var(--primary)' : 'transparent',
              color: mode === 'camera' ? 'white' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            <Camera size={16} />
            Camera
          </button>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div style={{ padding: '16px' }}>
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px',
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: '8px',
            marginBottom: '16px',
            color: 'var(--error)',
            fontSize: '13px',
          }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {mode === 'camera' ? (
          <div>
            <div
              id="barcode-scanner-container"
              ref={scannerContainerRef}
              style={{
                width: '100%',
                minHeight: '200px',
                borderRadius: '8px',
                overflow: 'hidden',
                background: 'var(--bg-tertiary)',
              }}
            />
            <p style={{
              marginTop: '12px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '13px',
            }}>
              Point your camera at a barcode or QR code
            </p>
          </div>
        ) : (
          <form onSubmit={handleManualSubmit}>
            <div style={{ position: 'relative' }}>
              <ScanLine
                size={18}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                ref={inputRef}
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={placeholder}
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 40px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                }}
              />
            </div>
            <p style={{
              marginTop: '8px',
              color: 'var(--text-muted)',
              fontSize: '12px',
            }}>
              Type or scan with USB scanner, then press Enter
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export function BarcodeScannerModal({
  isOpen,
  onClose,
  onScan,
  title = 'Scan Barcode',
}: {
  isOpen: boolean;
  onClose: () => void;
  onScan: (code: string, format?: string) => void;
  title?: string;
}) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          background: 'var(--bg-primary)',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{title}</h3>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
              }}
            >
              <X size={20} />
            </button>
          </div>
          <BarcodeScanner onScan={onScan} onClose={onClose} />
        </div>
      </div>
    </div>
  );
}
