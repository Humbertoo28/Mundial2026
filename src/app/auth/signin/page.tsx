'use client';

import { signIn } from 'next-auth/react';
import { LogIn, Layers } from 'lucide-react';

export default function SignIn() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-500 min-h-[calc(100vh-4rem)]">
      <div className="bg-white border border-[#474A4A]/20 p-8 md:p-12 rounded-3xl max-w-md w-full shadow-lg relative overflow-hidden">
        {/* Decoración de fondo */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#2A398D] to-[#3CAC3B]"></div>
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#3CAC3B]/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-[#2A398D]/10 rounded-full blur-3xl"></div>

        <div className="relative z-10">
          <div className="bg-[#D1D4D1]/30 p-4 rounded-full inline-block mb-6 border border-[#474A4A]/20">
            <Layers className="h-10 w-10 text-[#2A398D]" />
          </div>
          
          <h1 className="text-3xl font-bold mb-2 text-[#2A398D]">Bienvenido</h1>
          <p className="text-[#474A4A]/80 mb-8">
            Inicia sesión para gestionar tu colección del Mundial 2026.
          </p>

          <button 
            onClick={() => signIn('google', { callbackUrl: '/' })}
            className="w-full flex items-center justify-center gap-3 bg-white border border-[#474A4A]/20 hover:bg-[#D1D4D1]/50 text-[#474A4A] px-6 py-4 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-sm"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              <path fill="none" d="M1 1h22v22H1z" />
            </svg>
            Continuar con Google
          </button>
        </div>
      </div>
    </div>
  );
}
