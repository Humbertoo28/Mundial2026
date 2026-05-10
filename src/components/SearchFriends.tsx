'use client';

import { useState } from 'react';
import { Search, Users, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SearchFriends() {
  const [search, setSearch] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;
    router.push(`/u/${search.trim().toLowerCase()}`);
  };

  return (
    <div className="bg-white dark:bg-[#262626] border border-[#2A398D]/20 dark:border-white/10 p-6 rounded-3xl shadow-sm overflow-hidden relative group">
      <div className="absolute -right-12 -bottom-12 w-32 h-32 bg-[#2A398D]/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-[#2A398D] dark:bg-[#4C5DBB] rounded-xl text-white">
            <Users className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-black text-[#2A398D] dark:text-[#4C5DBB] uppercase tracking-tighter">Buscar Amigos</h2>
        </div>
        
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#474A4A]/40 dark:text-white/30 h-5 w-5" />
            <input 
              type="text" 
              placeholder="Escribe el @usuario de tu amigo..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#D1D4D1]/20 dark:bg-white/5 border border-[#474A4A]/10 dark:border-white/10 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-[#2A398D] dark:focus:border-[#4C5DBB] transition-all font-bold text-[#2A398D] dark:text-white"
            />
          </div>
          <button 
            type="submit"
            className="bg-[#2A398D] hover:bg-[#3CAC3B] text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
          >
            Ver Progreso
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
        <p className="text-[10px] font-bold text-[#474A4A]/40 dark:text-white/30 uppercase mt-3 tracking-widest">
          Ingresa el nombre de usuario personalizado para ver cómo va su álbum
        </p>
      </div>
    </div>
  );
}
