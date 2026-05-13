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

  const handleShareWhatsApp = () => {
    const text = `🏆 Mis Logros en Panini Tracker PTY 🏆\n\n` +
                 `👤 Usuario: @${username}\n` +
                 `📊 Progreso: ${stats.porcentaje}%\n` +
                 `✅ Conseguidas: ${stats.tengo}\n` +
                 `🔁 Repetidas: ${stats.repetidas}\n` +
                 `🤝 Figuritas Intercambiadas: ${stats.totalItemsTraded}\n\n` +
                 `¡Únete y completa tu álbum! 🇵🇦⚽️\nmundialhub.vercel.app`;
    
    const encodedText = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
  };

  const handleShareInstagram = () => {
    // Instagram no permite compartir texto/link directo desde web.
    // Lo mejor es copiar al portapapeles y avisar al usuario.
    const text = `🏆 Mis Logros en Panini Tracker PTY 🏆\n\n` +
                 `👤 Usuario: @${username}\n` +
                 `📊 Progreso: ${stats.porcentaje}%\n` +
                 `✅ Conseguidas: ${stats.tengo}\n` +
                 `🔁 Repetidas: ${stats.repetidas}\n` +
                 `🤝 Figuritas Intercambiadas: ${stats.totalItemsTraded}\n\n` +
                 `¡Únete y completa tu álbum! 🇵🇦⚽️\nmundialhub.vercel.app`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    // Intentar abrir Instagram
    window.open('https://www.instagram.com/', '_blank');
  };

  const handleCopyText = () => {
    const text = `🏆 Mis Logros en Panini Tracker PTY 🏆\n\n` +
                 `👤 Usuario: @${username}\n` +
                 `📊 Progreso: ${stats.porcentaje}%\n` +
                 `✅ Conseguidas: ${stats.tengo}\n` +
                 `🔁 Repetidas: ${stats.repetidas}\n` +
                 `🤝 Figuritas Intercambiadas: ${stats.totalItemsTraded}\n\n` +
                 `¡Únete y completa tu álbum! 🇵🇦⚽️\nmundialhub.vercel.app`;

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
              <p className="text-[10px] font-black text-[#474A4A]/40 uppercase tracking-widest text-center mb-2">Compartir en Redes Sociales</p>
              
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
