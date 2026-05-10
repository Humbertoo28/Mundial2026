'use client';

import { signOut } from "next-auth/react";
import Link from "next/link";
import { LogOut, ArrowLeft } from "lucide-react";

export default function SignOutPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#D1D4D1] dark:bg-[#1A1A1A] px-4">
      <div className="max-w-md w-full bg-white dark:bg-[#262626] rounded-3xl p-8 shadow-2xl border border-[#2A398D]/10 dark:border-white/5 text-center animate-in fade-in zoom-in duration-300">
        <div className="w-20 h-20 bg-[#E61D25]/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <LogOut className="h-10 w-10 text-[#E61D25]" />
        </div>
        
        <h1 className="text-3xl font-black text-[#2A398D] dark:text-white uppercase italic tracking-tighter mb-2">
          Cerrar Sesión
        </h1>
        <p className="text-[#474A4A]/70 dark:text-white/60 font-medium mb-8">
          ¿Estás seguro de que deseas salir de Panini Tracker PTY?
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="w-full bg-[#E61D25] hover:bg-[#C5181F] text-white font-black uppercase py-4 rounded-2xl transition-all shadow-lg hover:scale-[1.02] active:scale-95"
          >
            Sí, cerrar sesión
          </button>
          
          <Link 
            href="/"
            className="w-full bg-[#D1D4D1]/50 dark:bg-white/5 hover:bg-[#D1D4D1] dark:hover:bg-white/10 text-[#474A4A] dark:text-white font-bold uppercase py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            No, volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
