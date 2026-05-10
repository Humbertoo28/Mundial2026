'use client';

import { useState } from 'react';
import { User, Check, Edit2, X } from 'lucide-react';
import { updateUsername } from '@/app/actions/profile';

export default function UsernameSettings({ initialUsername }: { initialUsername: string | null }) {
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(initialUsername || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!username.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await updateUsername(username);
      if (result.success) {
        setIsEditing(false);
      } else {
        setError(result.error || 'Error al guardar');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-[#474A4A]/20 p-4 rounded-2xl shadow-sm mb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#2A398D]/10 rounded-lg">
            <User className="h-5 w-5 text-[#2A398D]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#474A4A]/60 uppercase tracking-wider">Nombre de Usuario</h3>
            {isEditing ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 15))}
                  placeholder="Ej: panagol_10"
                  className="bg-[#D1D4D1]/30 border border-[#2A398D]/20 text-[#2A398D] rounded-lg px-3 py-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#2A398D]"
                  autoFocus
                />
                <button 
                  onClick={handleSave}
                  disabled={loading}
                  className="p-1 bg-[#3CAC3B] text-white rounded-md hover:scale-110 transition-transform disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => {
                    setIsEditing(false);
                    setUsername(initialUsername || '');
                  }}
                  className="p-1 bg-[#E61D25] text-white rounded-md hover:scale-110 transition-transform"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <p className="text-lg font-black text-[#2A398D] flex items-center gap-2">
                {initialUsername || 'Sin nombre de usuario'}
                <button 
                  onClick={() => setIsEditing(true)}
                  className="p-1 text-[#474A4A]/40 hover:text-[#2A398D] transition-colors"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
              </p>
            )}
          </div>
        </div>
        
        {error && <span className="text-xs text-[#E61D25] font-bold">{error}</span>}
      </div>
    </div>
  );
}
