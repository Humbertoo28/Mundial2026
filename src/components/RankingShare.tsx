'use client';

import { useState, useRef } from 'react';
import { Share2, Download, Check, Trophy, X, Layers } from 'lucide-react';

type RankingUser = {
  username: string;
  avatar_url: string | null;
  tengo: number;
  porcentaje: number;
  total: number;
};

export default function RankingShare({ top5 }: { top5: RankingUser[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateImageFile = async (): Promise<File | null> => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // 1. Configuración del Canvas (9:16 - Estilo Story)
    canvas.width = 1080;
    canvas.height = 1920;

    // 2. Fondo con degradado Premium
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#2A398D'); // Azul
    gradient.addColorStop(0.5, '#1e2a6d');
    gradient.addColorStop(1, '#0f172a'); // Casi negro
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Decoraciones (círculos difuminados)
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#3CAC3B';
    ctx.beginPath();
    ctx.arc(100, 100, 400, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#E61D25';
    ctx.beginPath();
    ctx.arc(canvas.width - 100, canvas.height - 100, 500, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // 3. Título (Ajustado para que no se corte)
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'italic 900 95px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TOP 5 COLECCIONISTAS', canvas.width / 2, 280);
    
    ctx.fillStyle = '#3CAC3B';
    ctx.font = '900 45px Inter';
    ctx.fillText('PANINI WORLD CUP 2026 TRACKER', canvas.width / 2, 360);

    // 4. Dibujar el Ranking (Top 5)
    let yOffset = 450;
    const rowHeight = 220;

    // Helpers para Canvas
    const loadImage = (src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    };

    const roundRect = (
      ctx: CanvasRenderingContext2D, 
      x: number, y: number, w: number, h: number, r: number, 
      fill: boolean, stroke: boolean
    ) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      if (fill) ctx.fill();
      if (stroke) ctx.stroke();
    };

    for (let i = 0; i < top5.length; i++) {
      const user = top5[i];
      const isFirst = i === 0;

      // Caja de fila
      ctx.fillStyle = isFirst ? 'rgba(255, 215, 0, 0.15)' : 'rgba(255, 255, 255, 0.05)';
      ctx.strokeStyle = isFirst ? '#FFD700' : 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 4;
      roundRect(ctx, 80, yOffset, canvas.width - 160, rowHeight, 40, true, true);

      // Número / Medalla
      ctx.fillStyle = isFirst ? '#FFD700' : '#FFFFFF';
      ctx.font = '900 italic 70px Inter';
      ctx.textAlign = 'left';
      ctx.fillText(`#${i + 1}`, 130, yOffset + rowHeight / 2 + 25);

      // Avatar (Circular)
      try {
        const avatar = await loadImage(user.avatar_url || 'https://flagcdn.com/w80/pa.png');
        ctx.save();
        ctx.beginPath();
        ctx.arc(350, yOffset + rowHeight / 2, 70, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(avatar, 280, yOffset + rowHeight / 2 - 70, 140, 140);
        ctx.restore();
        
        // Borde del avatar
        ctx.strokeStyle = isFirst ? '#FFD700' : '#FFFFFF';
        ctx.lineWidth = 5;
        ctx.stroke();
      } catch (e) {
        // Fallback si falla la imagen
        ctx.fillStyle = '#D1D4D1';
        ctx.beginPath();
        ctx.arc(350, yOffset + rowHeight / 2, 70, 0, Math.PI * 2);
        ctx.fill();
      }

      // Nombre de usuario (Más pequeño para evitar choque)
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 italic 45px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`@${user.username.toUpperCase()}`, 450, yOffset + 100);

      // Barra de progreso
      // Barra de progreso
      const barWidth = 320; // Más corto para dar más espacio
      const barHeight = 25;
      const filledWidth = (user.porcentaje / 100) * barWidth;
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      roundRect(ctx, 450, yOffset + 130, barWidth, barHeight, 12, true, false);
      
      ctx.fillStyle = isFirst ? '#FFD700' : '#3CAC3B';
      roundRect(ctx, 450, yOffset + 130, filledWidth, barHeight, 12, true, false);

      // Porcentaje (Texto más grande para que se vea)
      ctx.fillStyle = isFirst ? '#FFD700' : '#FFFFFF';
      ctx.font = 'italic 900 65px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${user.porcentaje}%`, 1000, yOffset + 155);
      
      // Conteo debajo (pequeño)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '900 30px Inter, sans-serif';
      ctx.fillText(`${user.tengo} / ${user.total}`, 1000, yOffset + 205);

      yOffset += rowHeight + 30;
    }

    // 5. Pie de imagen (QR o URL)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '900 35px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('ÚNETE A LA COLECCIÓN EN:', canvas.width / 2, canvas.height - 150);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 italic 50px Inter';
    ctx.fillText('MUNDIAL2026-INDOL.VERCEL.APP', canvas.width / 2, canvas.height - 80);

    // Convertir a File
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) resolve(null);
        else resolve(new File([blob], `ranking_mundial.png`, { type: 'image/png' }));
      }, 'image/png');
    });
  };


  const handleShare = async () => {
    setIsGenerating(true);
    const file = await generateImageFile();
    setIsGenerating(false);

    if (file && navigator.share) {
      try {
        await navigator.share({
          files: [file],
          title: 'Ranking Mundial Panini 2026',
          text: '¡Mira los coleccionistas líderes del Mundial 2026! ¿Podrás superarlos? 🏆⚽️',
        });
      } catch (err) {
        // Fallback a descarga si falla share
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ranking_mundial.png';
        a.click();
      }
    } else if (file) {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ranking_mundial.png';
      a.click();
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText('https://mundial2026-indol.vercel.app/ranking');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="bg-gradient-to-r from-[#2A398D] to-[#3CAC3B] text-white px-8 py-4 rounded-2xl flex items-center gap-3 shadow-xl hover:scale-105 transition-all active:scale-95 group"
      >
        <Share2 className="h-6 w-6 group-hover:animate-bounce" />
        <span className="font-black uppercase tracking-widest text-sm">Compartir Ranking</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#0D0D0D] w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col">
            <div className="p-8 border-b border-[#474A4A]/10 dark:border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-[#2A398D] dark:text-white uppercase italic">Compartir Top 5</h2>
                <p className="text-[10px] text-[#474A4A]/40 font-bold uppercase tracking-widest">Generar imagen oficial</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
                <X className="h-6 w-6 dark:text-white" />
              </button>
            </div>

            <div className="p-8 flex flex-col gap-4">
              <button 
                onClick={handleShare}
                disabled={isGenerating}
                className="w-full bg-[#2A398D] text-white py-5 rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg hover:bg-[#3CAC3B] transition-all flex items-center justify-center gap-3"
              >
                {isGenerating ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Share2 className="h-5 w-5" />}
                {isGenerating ? 'Generando...' : 'Compartir Imagen'}
              </button>

              <button 
                onClick={handleCopyLink}
                className="w-full bg-[#D1D4D1]/20 dark:bg-white/5 text-[#2A398D] dark:text-white py-5 rounded-2xl font-black uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-3"
              >
                {copied ? <Check className="h-5 w-5 text-green-500" /> : <Layers className="h-5 w-5" />}
                {copied ? '¡Copiado!' : 'Copiar Link del Ranking'}
              </button>
            </div>

            {/* Hidden Canvas */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>
        </div>
      )}
    </>
  );
}

// Re-using the same icons if needed
function RefreshCw(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  )
}
