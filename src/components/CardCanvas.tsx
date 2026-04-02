import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

interface CardCanvasProps {
  imageUrl: string;
  pwr: number;
  str: number;
  characterName: string;
  animeSource: string;
  cardUrl: string;
  onCanvasReady?: (blob: Blob) => void;
}

export const CardCanvas: React.FC<CardCanvasProps> = ({
  imageUrl,
  pwr,
  str,
  characterName,
  animeSource,
  cardUrl,
  onCanvasReady
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const renderCanvas = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas dimensions
      canvas.width = 800;
      canvas.height = 1200;

      // Load main image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imageUrl;
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // Draw main image full bleed
      // Cover logic
      const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
      const x = (canvas.width / 2) - (img.width / 2) * scale;
      const y = (canvas.height / 2) - (img.height / 2) * scale;
      ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

      // Draw Obsidian Stats Box (Glassmorphism effect)
      const boxHeight = 280;
      const boxY = canvas.height - boxHeight;
      
      // Semi-transparent black background
      ctx.fillStyle = 'rgba(10, 10, 10, 0.75)';
      ctx.fillRect(0, boxY, canvas.width, boxHeight);
      
      // Top border for the glass box
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, boxY);
      ctx.lineTo(canvas.width, boxY);
      ctx.stroke();

      // Character Name & Anime Source
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(characterName.toUpperCase(), 40, boxY + 70);
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '500 24px Inter, sans-serif';
      ctx.fillText(animeSource.toUpperCase(), 40, boxY + 110);

      // Draw Medallions
      const drawMedallion = (cx: number, cy: number, label: string, value: number, glowColor: string) => {
        const radius = 50;
        
        // Glow
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 20;
        ctx.fillStyle = 'rgba(20, 20, 20, 0.9)';
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Border
        ctx.shadowBlur = 0;
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 3;
        ctx.stroke();

        // Value
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Outline text
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.strokeText(value.toString(), cx, cy - 5);
        ctx.fillText(value.toString(), cx, cy - 5);

        // Label
        ctx.fillStyle = glowColor;
        ctx.font = 'bold 16px Inter, sans-serif';
        ctx.fillText(label, cx, cy + 25);
      };

      // PWR Medallion (Emerald)
      drawMedallion(100, boxY + 200, 'PWR', pwr, '#10b981');
      
      // STR Medallion (White)
      drawMedallion(240, boxY + 200, 'STR', str, '#ffffff');

      // Generate and draw QR Code
      try {
        const qrDataUrl = await QRCode.toDataURL(cardUrl, {
          width: 160,
          margin: 1,
          color: {
            dark: '#ffffff',
            light: '#00000000' // Transparent background
          }
        });
        
        const qrImg = new Image();
        qrImg.src = qrDataUrl;
        await new Promise((resolve) => {
          qrImg.onload = resolve;
        });
        
        // Draw QR code background
        const qrSize = 160;
        const qrX = canvas.width - qrSize - 40;
        const qrY = boxY + (boxHeight - qrSize) / 2;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.roundRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 12);
        ctx.fill();
        
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
      } catch (err) {
        console.error("Failed to generate QR code", err);
      }

      setIsReady(true);
      
      if (onCanvasReady) {
        canvas.toBlob((blob) => {
          if (blob) onCanvasReady(blob);
        }, 'image/jpeg', 0.9);
      }
    };

    renderCanvas();
  }, [imageUrl, pwr, str, characterName, animeSource, cardUrl, onCanvasReady]);

  return (
    <div className="relative w-full max-w-sm mx-auto aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full object-cover"
        style={{ opacity: isReady ? 1 : 0, transition: 'opacity 0.3s ease' }}
      />
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 animate-pulse">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};
