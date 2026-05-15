import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";
import ChatWidget from "@/components/ChatWidget";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Panini Tracker PTY - Mundial 2026",
  description: "Colecciona y gestiona tus figuritas del mundial 2026.",
  icons: {
    icon: "https://flagcdn.com/w80/pa.png",
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-[#D1D4D1] dark:bg-[#000000] text-[#474A4A] dark:text-white">
        <Providers>
          <Navbar />
          <ChatWidget />
          <main className="flex-1 flex flex-col">
            {children}
          </main>
          <footer className="w-full py-6 text-center border-t border-[#474A4A]/10 mt-auto">
            <p className="text-sm font-bold text-[#474A4A]/60 uppercase tracking-widest">
              creado por <a href="https://www.instagram.com/humbertiex_?igsh=MXZsN3N2ZGpnZGI3&utm_source=qr" target="_blank" rel="noopener noreferrer" className="text-[#2A398D] hover:text-[#3CAC3B] transition-colors underline decoration-dotted underline-offset-4">humbertiex</a>
            </p>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
