'use client'

import { SessionProvider } from "next-auth/react"
import { ThemeProvider } from "./ThemeProvider"
import { useState, useEffect } from 'react'

export default function Providers({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ThemeProvider>
      <SessionProvider>
        {loading ? (
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#D1D4D1] dark:bg-[#000000] transition-opacity duration-500">
            <div className="relative">
              <div className="absolute inset-0 bg-[#2A398D] blur-3xl opacity-20 animate-pulse rounded-full"></div>
              <img 
                src="https://flagcdn.com/w160/pa.png" 
                alt="Bandera de Panamá" 
                className="h-24 w-auto rounded-lg shadow-2xl relative z-10 animate-pulse border-2 border-white/20"
              />
            </div>
            <h1 className="mt-8 text-2xl font-black text-[#2A398D] dark:text-white tracking-widest animate-bounce">
              Panini Tracker PTY
            </h1>
          </div>
        ) : (
          children
        )}
      </SessionProvider>
    </ThemeProvider>
  )
}
