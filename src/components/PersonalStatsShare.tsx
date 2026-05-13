'use client';

import { useState } from 'react';
import { Share2, Users, RefreshCw, Trophy, X, MessageSquare, Copy, Check } from 'lucide-react';

type Stats = {
  tengo: number;
  faltan: number;
  repetidas: number;
  porcentaje: number;
  totalTrades: number;
  uniqueTradersCount: number;
  totalItemsTraded: number;
};

export default function PersonalStatsShare({ 
  stats, 
  username, 
  avatarUrl 
}: { 
  stats: Stats, 
  username: string,
  avatarUrl: string
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateImageFile = async (): Promise<File | null> => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const gradient = ctx.createLinearGradient(0, 0, 0, 1920);
    gradient.addColorStop(0, '#2A398D');
    gradient.addColorStop(0.5, '#1e2a6d');
    gradient.addColorStop(1, '#0f172a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1920);

    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#3CAC3B';
    ctx.beginPath(); ctx.arc(0, 0, 500, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#E61D25';
    ctx.beginPath(); ctx.arc(1080, 1920, 500, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1.0;

    // Título (Agrandado)
    ctx.font = 'black italic 80px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.textAlign = 'center';
    ctx.fillText('MI PROGRESO', 540, 350);

    ctx.font = '900 italic 320px Arial';
    ctx.fillStyle = 'white';
    ctx.fillText(`${stats.porcentaje}%`, 540, 680);

    const drawCard = (y: number, label: string, value: string | number, color?: string) => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath(); ctx.roundRect(140, y, 800, 200, 40); ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 2; ctx.stroke();
      
      ctx.font = 'bold 35px Arial';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillText(label.toUpperCase(), 540, y + 60);
      
      ctx.font = '900 90px Arial';
      ctx.fillStyle = color || 'white';
      ctx.fillText(String(value), 540, y + 155);
    };

    drawCard(850, 'Tengo', `${stats.tengo} Figuritas`, '#3CAC3B');
    drawCard(1100, 'Repetidas', stats.repetidas, 'white');
    drawCard(1350, 'Intercambiadas', stats.totalItemsTraded, 'white');

    ctx.font = 'black italic 80px Arial';
    ctx.fillStyle = 'white';
    ctx.fillText(`@${username.toUpperCase()}`, 540, 1700);
    ctx.font = 'bold 35px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillText('MUNDIAL2026-INDOL.VERCEL.APP', 540, 1770);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) return resolve(null);
        const file = new File([blob], `logros_panini_${username}.png`, { type: 'image/png' });
        resolve(file);
      }, 'image/png');
    });
  };

  const handleDownloadImage = async () => {
    const file = await generateImageFile();
    if (!file) return;
    
    const link = document.createElement('a');
    link.download = file.name;
    link.href = URL.createObjectURL(file);
    link.click();
  };

  const handleShareWhatsApp = async () => {
    const file = await generateImageFile();
    const text = `🏆 Mis Logros en Panini Tracker PTY 🏆\n\n` +
                 `📊 Progreso: ${stats.porcentaje}%\n` +
                 `✅ Conseguidas: ${stats.tengo}\n\n` +
                 `¡Únete! mundial2026-indol.vercel.app`;

    if (navigator.share && file && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Mis Logros Panini Tracker',
          text: text,
        });
      } catch (err) {
        console.error("Error sharing file:", err);
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
      }
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  const handleShareInstagram = async () => {
    const file = await generateImageFile();
    const text = `🏆 Mis Logros en Panini Tracker PTY 🏆\n\n` +
                 `📊 Progreso: ${stats.porcentaje}%\n` +
                 `✅ Conseguidas: ${stats.tengo}\n\n` +
                 `¡Únete! mundial2026-indol.vercel.app`;

    if (navigator.share && file && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Mis Logros Panini Tracker',
          text: text,
        });
      } catch (err) {
        console.error("Error sharing file:", err);
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        window.open('https://www.instagram.com/', '_blank');
      }
    } else {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      window.open('https://www.instagram.com/', '_blank');
    }
  };

  const handleCopyText = () => {
    const text = `🏆 Mis Logros en Panini Tracker PTY 🏆\n\n` +
                 `👤 Usuario: @${username}\n` +
                 `📊 Progreso: ${stats.porcentaje}%\n` +
                 `✅ Conseguidas: ${stats.tengo}\n` +
                 `🔁 Repetidas: ${stats.repetidas}\n` +
                 `🤝 Figuritas Intercambiadas: ${stats.totalItemsTraded}\n\n` +
                 `¡Únete y completa tu álbum! 🇵🇦⚽️\nmundial2026-indol.vercel.app`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-[#262626] border border-[#2A398D]/10 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="bg-[#2A398D]/10 p-3 rounded-xl text-[#2A398D]">
            <RefreshCw className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-[#474A4A]/40 uppercase tracking-widest">Intercambios</p>
            <p className="text-xl font-black text-[#2A398D]">{stats.totalTrades}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#262626] border border-[#3CAC3B]/10 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
          <div className="bg-[#3CAC3B]/10 p-3 rounded-xl text-[#3CAC3B]">
            <Check className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-[#474A4A]/40 uppercase tracking-widest">Figuritas</p>
            <p className="text-xl font-black text-[#3CAC3B]">{stats.tengo}</p>
          </div>
        </div>

        <button 
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-r from-[#2A398D] to-[#3CAC3B] text-white p-5 rounded-2xl flex items-center justify-center gap-3 shadow-lg hover:scale-105 transition-all active:scale-95 group"
        >
          <Share2 className="h-6 w-6 group-hover:animate-bounce" />
          <span className="font-black uppercase tracking-widest text-xs">Compartir Logros</span>
        </button>
      </div>

      {/* Modal de Compartir */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative bg-white dark:bg-[#1A1A1A] w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            
            {/* Botón Cerrar */}
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-6 right-6 z-10 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Layout Estilo Story */}
            <div className="relative aspect-[9/16] w-full bg-gradient-to-b from-[#2A398D] via-[#1e2a6d] to-[#0f172a] p-8 flex flex-col items-center justify-center text-center">
              
              {/* Decoraciones */}
              <div className="absolute -top-20 -left-20 w-64 h-64 bg-[#3CAC3B]/20 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-[#E61D25]/20 rounded-full blur-3xl"></div>

              <div className="relative z-10 flex flex-col items-center w-full">
                <div className="bg-white p-2 rounded-2xl mb-6 shadow-xl rotate-3">
                  <Trophy className="h-12 w-12 text-[#FFD700]" />
                </div>

                <h2 className="text-white text-xs font-black uppercase tracking-[0.3em] mb-2 opacity-70">Mi Progreso</h2>
                <p className="text-6xl font-black text-white mb-8 tracking-tighter italic">
                  {stats.porcentaje}<span className="text-3xl opacity-50">%</span>
                </p>

                <div className="w-full space-y-4 mb-8">
                  <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                    <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Tengo</p>
                    <p className="text-2xl font-black text-[#3CAC3B]">{stats.tengo} <span className="text-xs text-white/40">figuritas</span></p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                      <p className="text-[8px] font-black text-white/50 uppercase tracking-widest mb-1">Repetidas</p>
                      <p className="text-xl font-black text-white">{stats.repetidas}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                      <p className="text-[8px] font-black text-white/50 uppercase tracking-widest mb-1">Intercambiadas</p>
                      <p className="text-xl font-black text-white">{stats.totalItemsTraded}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-col items-center gap-3">
                   <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
                     <img src={avatarUrl} alt={username} className="w-8 h-8 rounded-full border-2 border-white/50" />
                     <p className="text-white font-black italic text-lg tracking-tight">@{username}</p>
                   </div>
                   <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">mundialhub.vercel.app</p>
                </div>
              </div>
            </div>

            {/* Acciones del Modal */}
            <div className="p-6 bg-white dark:bg-[#1A1A1A] border-t border-[#474A4A]/10 dark:border-white/10 flex flex-col gap-3">
              <button 
                onClick={handleDownloadImage}
                className="w-full flex items-center justify-center gap-3 bg-[#3CAC3B] text-white py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-lg hover:scale-[1.02] active:scale-95 transition-all mb-2"
              >
                <Share2 className="h-5 w-5" />
                Descargar Tarjeta (Imagen)
              </button>

              <p className="text-[10px] font-black text-[#474A4A]/40 uppercase tracking-widest text-center mb-1">Compartir texto directo</p>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={handleShareInstagram}
                  className="flex items-center justify-center gap-2 bg-gradient-to-br from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-md active:scale-95 transition-all"
                >
                  <Share2 className="h-4 w-4" />
                  Instagram
                </button>
                <button 
                  onClick={handleShareWhatsApp}
                  className="flex items-center justify-center gap-2 bg-[#25D366] text-white py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-md active:scale-95 transition-all"
                >
                  <MessageSquare className="h-4 w-4" />
                  WhatsApp
                </button>
              </div>
              
              <button 
                onClick={handleCopyText}
                className="flex items-center justify-center gap-2 text-[#474A4A]/60 font-bold text-xs hover:text-[#2A398D] py-2 transition-colors"
              >
                {copied ? <Check className="h-3 w-3 text-[#3CAC3B]" /> : <Copy className="h-3 w-3" />}
                {copied ? '¡Copiado al portapapeles!' : 'Copiar estadísticas como texto'}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
