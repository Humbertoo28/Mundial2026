'use client';

import { useState } from 'react';
import { Image as ImageIcon, Check } from 'lucide-react';
import { COUNTRY_FLAGS } from '@/lib/flags';
import { updateAvatar } from '@/app/actions/profile';

export default function AvatarSelector({ currentAvatar }: { currentAvatar: string | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const countries = Object.keys(COUNTRY_FLAGS).sort();

  const handleSelect = async (countryName: string) => {
    setLoading(true);
    const flagCode = COUNTRY_FLAGS[countryName];
    const flagUrl = `https://flagcdn.com/w160/${flagCode}.png`;
    
    try {
      await updateAvatar(flagUrl);
      setIsOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-[#474A4A]/20 p-4 rounded-2xl shadow-sm mb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#E61D25]/10 rounded-lg">
            <ImageIcon className="h-5 w-5 text-[#E61D25]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#474A4A]/60 uppercase tracking-wider">Tu Bandera / Avatar</h3>
            <div className="flex items-center gap-4 mt-2">
              <img 
                src={currentAvatar || 'https://via.placeholder.com/80'} 
                className="w-12 h-12 rounded-full border-2 border-[#2A398D] shadow-sm object-cover" 
                alt="Avatar"
              />
              <button 
                onClick={() => setIsOpen(!isOpen)}
                className="text-xs font-bold bg-[#2A398D] text-white px-4 py-2 rounded-lg hover:bg-[#3CAC3B] transition-colors"
              >
                {isOpen ? 'Cerrar Selector' : 'Cambiar Selección'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="mt-6 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 max-h-60 overflow-y-auto p-2 bg-[#D1D4D1]/10 rounded-xl custom-scrollbar">
          {countries.map((country) => {
            const flagCode = COUNTRY_FLAGS[country];
            const url = `https://flagcdn.com/w80/${flagCode}.png`;
            const isSelected = currentAvatar?.includes(flagCode);

            return (
              <button
                key={country}
                onClick={() => handleSelect(country)}
                disabled={loading}
                className={`relative group flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                  isSelected ? 'bg-[#2A398D]/20 ring-2 ring-[#2A398D]' : 'hover:bg-white hover:shadow-md'
                }`}
              >
                <img 
                  src={url} 
                  alt={country}
                  className="w-10 h-7 object-cover rounded shadow-sm"
                />
                <span className="text-[8px] font-black uppercase text-[#474A4A]/60 text-center line-clamp-1">{country}</span>
                {isSelected && (
                  <div className="absolute -top-1 -right-1 bg-[#3CAC3B] text-white rounded-full p-0.5">
                    <Check className="h-2 w-2" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
