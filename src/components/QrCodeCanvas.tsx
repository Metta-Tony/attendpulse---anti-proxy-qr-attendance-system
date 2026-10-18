import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface QrCodeCanvasProps {
  value: string;
  size?: number;
  className?: string;
}

export const QrCodeCanvas: React.FC<QrCodeCanvasProps> = ({
  value,
  size = 280,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      QRCode.toCanvas(
        canvasRef.current,
        value,
        {
          width: size,
          margin: 1,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
          errorCorrectionLevel: 'M',
        },
        (error) => {
          if (error) console.error('QR rendering error:', error);
        }
      );
    }
  }, [value, size]);

  return (
    <div className={`flex items-center justify-center p-2 bg-white rounded-lg shadow-inner ${className}`}>
      <canvas ref={canvasRef} className="max-w-full h-auto block rounded" />
    </div>
  );
};
