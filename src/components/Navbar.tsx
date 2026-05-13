import Link from 'next/link';
import { LogIn, LogOut, LayoutDashboard, Grid, RefreshCw, Database, Trophy } from 'lucide-react';
import { getServerSession } from 'next-auth';
import ThemeToggle from './ThemeToggle';
import { getProfile } from '@/app/actions/profile';
import { authOptions } from '@/lib/authOptions';

export default async function Navbar() {
  const session = await getServerSession(authOptions);
  const profile = session ? await getProfile() : null;
  const displayName = profile?.username || session?.user?.name || "Usuario";

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-[#2A398D]/20 bg-[#2A398D] shadow-lg">
      <div className="container mx-auto px-2 sm:px-4 min-h-[4rem] py-2 flex flex-col md:flex-row items-center justify-between gap-2 md:gap-0">
        <div className="flex flex-col md:flex-row items-center gap-2 md:gap-6 w-full md:w-auto">
          <Link href="/" className="flex items-center gap-2 font-black text-lg sm:text-2xl text-white tracking-tighter">
            <div className="bg-white p-1 rounded-lg shadow-inner flex items-center justify-center">
              <img 
                src="https://flagcdn.com/w80/pa.png" 
                alt="Bandera de Panamá" 
                className="h-6 sm:h-8 w-auto rounded border border-[#474A4A]/20"
              />
            </div>
            <span>Panini Tracker PTY</span>
          </Link>
          
          {session?.user && (
            <div className="flex flex-wrap sm:flex-nowrap gap-2 sm:gap-4 overflow-x-auto hide-scrollbar pb-1 sm:pb-0">
              <Link href="/" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-white/80 hover:text-white transition-colors whitespace-nowrap">
                <LayoutDashboard className="h-3 w-3 sm:h-4 sm:w-4" />
                Resumen
              </Link>
              <Link href="/album" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-white/80 hover:text-white transition-colors whitespace-nowrap">
                <Grid className="h-3 w-3 sm:h-4 sm:w-4" />
                Mi Álbum
              </Link>
              <Link href="/ranking" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-white/80 hover:text-white transition-colors whitespace-nowrap">
                <Trophy className="h-3 w-3 sm:h-4 sm:w-4" />
                Ranking
              </Link>
              {session.user.email === (process.env.ADMIN_EMAIL || "humbertolandero78@gmail.com") && (
                <Link href="/admin" className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-[#FFD700] hover:text-white transition-colors bg-white/10 px-2 sm:px-3 py-1 rounded-lg whitespace-nowrap">
                  <Database className="h-3 w-3 sm:h-4 sm:w-4" />
                  Panel Admin
                </Link>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          {session?.user ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <img 
                  src={profile?.avatar_url || session.user.image || 'https://via.placeholder.com/32'} 
                  alt="Profile" 
                  className="w-8 h-8 rounded-full border border-white/20 shadow-sm object-cover"
                />
                <span className="text-sm text-white/80 hidden sm:inline-block font-bold">
                  @{displayName}
                </span>
              </div>
              <Link 
                href="/auth/signout"
                className="flex items-center gap-2 text-sm font-medium bg-white text-[#2A398D] hover:bg-[#E61D25] hover:text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
              >
                <LogOut className="h-4 w-4" />
                Salir
              </Link>
            </div>
          ) : (
            <a 
              href="/api/auth/signin"
              className="flex items-center gap-2 text-sm font-medium bg-[#3CAC3B] hover:bg-white hover:text-[#3CAC3B] text-white px-4 py-2 rounded-lg transition-colors shadow-md"
            >
              <LogIn className="h-4 w-4" />
              Entrar con Google
            </a>
          )}
        </div>
      </div>
    </nav>
  );
}
