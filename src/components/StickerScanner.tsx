'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, X, Loader2, CheckCircle2, AlertCircle, RefreshCw, Search, Type, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Extend Window type for TextDetector (experimental API)
declare global {
  interface Window {
    TextDetector: new () => {
      detect(image: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement): Promise<Array<{ rawValue: string }>>;
    };
  }
}

type StickerScannerProps = {
  isOpen: boolean;
  onClose: () => void;
  onDetected: (id: string) => void;
  validIds: string[];
};

export default function StickerScanner({ isOpen, onClose, onDetected, validIds }: StickerScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const detectorRef = useRef<InstanceType<typeof window.TextDetector> | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<'checking' | 'camera' | 'photo' | 'manual'>('checking');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success'>('idle');
  const [detectedId, setDetectedId] = useState<string | null>(null);
  
  // Manual mode state
  const [manualInput, setManualInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  // Photo mode state (iOS Fallback)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrMessage, setOcrMessage] = useState('');

  // Pre-normalize valid IDs
  const normalizedMap = useRef<Record<string, string>>({});
  useEffect(() => {
    const map: Record<string, string> = {};
    validIds.forEach(id => {
      map[id.replace(/\s/g, '').toUpperCase()] = id;
    });
    normalizedMap.current = map;
  }, [validIds]);

  // Check for TextDetector support on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'TextDetector' in window) {
      try {
        detectorRef.current = new window.TextDetector();
        setMode('camera');
      } catch {
        setMode('photo'); // iOS/Safari fallback
      }
    } else {
      setMode('photo'); // iOS/Safari fallback
    }
  }, []);

  const handleDetect = useCallback((rawId: string) => {
    setDetectedId(rawId);
    setStatus('success');
    onDetected(rawId);
    setTimeout(() => {
      setStatus('idle');
      setDetectedId(null);
      setPhotoPreview(null);
    }, 2500);
  }, [onDetected]);

  // --- ANDROID NATIVE CAMERA MODE ---
  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => setIsCameraReady(true));
        };
      }
    } catch {
      setError('No se pudo acceder a la cámara.');
    }
  };

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    setIsCameraReady(false);
  }, []);

  useEffect(() => {
    if (!isOpen) { stopCamera(); return; }
    if (mode === 'camera') startCamera();
    return () => stopCamera();
  }, [isOpen, mode, stopCamera]);

  const processFrame = useCallback(async () => {
    if (!isCameraReady || !videoRef.current || !detectorRef.current || status !== 'idle') return;
    const video = videoRef.current;
    if (video.videoWidth === 0) return;

    setStatus('scanning');
    try {
      const results = await detectorRef.current.detect(video);
      let foundId: string | null = null;

      for (const result of results) {
        const words = result.rawValue.toUpperCase().replace(/[^A-Z0-9\s]/g, '').split(/\s+/);
        for (const word of words) {
          if (normalizedMap.current[word]) { foundId = normalizedMap.current[word]; break; }
        }
        if (!foundId) {
          for (let i = 0; i < words.length - 1; i++) {
            const combined = words[i] + words[i + 1];
            if (normalizedMap.current[combined]) { foundId = normalizedMap.current[combined]; break; }
          }
        }
        if (foundId) break;
      }

      if (foundId) {
        handleDetect(foundId);
      } else {
        setStatus('idle');
      }
    } catch {
      setStatus('idle');
    }
  }, [isCameraReady, status, handleDetect]);

  useEffect(() => {
    if (!isCameraReady || mode !== 'camera') return;
    scanIntervalRef.current = setInterval(processFrame, 700);
    return () => { if (scanIntervalRef.current) clearInterval(scanIntervalRef.current); };
  }, [isCameraReady, mode, processFrame]);

  // --- iOS PHOTO FALLBACK MODE ---
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const imageUrl = URL.createObjectURL(file);
    setPhotoPreview(imageUrl);
    setStatus('scanning');
    setOcrProgress(0);
    setOcrMessage('Iniciando IA...');
    setError(null);

    try {
      // Lazy load tesseract only when needed so Android users don't download it
      const { createWorker } = await import('tesseract.js');
      
      const worker = await createWorker('eng', 1, {
        logger: m => {
          if (m.status === 'loading eng.traineddata' || m.status === 'loading tesseract core') {
            setOcrMessage('Descargando IA...');
            setOcrProgress(Math.round(m.progress * 50)); // First 50%
          } else if (m.status === 'recognizing text') {
            setOcrMessage('Analizando foto...');
            setOcrProgress(50 + Math.round(m.progress * 50)); // Last 50%
          }
        },
        langPath: 'https://tessdata.projectnaptha.com/4.0.0_fast',
      });

      await worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ',
        tessedit_pageseg_mode: '1' as any,
      });

      const { data: { text } } = await worker.recognize(imageUrl);
      await worker.terminate();

      const words = text.toUpperCase().replace(/[^A-Z0-9\s]/g, '').split(/\s+/);
      let foundId: string | null = null;

      for (const word of words) {
        if (normalizedMap.current[word]) { foundId = normalizedMap.current[word]; break; }
      }
      if (!foundId) {
        for (let i = 0; i < words.length - 1; i++) {
          const combined = words[i] + words[i + 1];
          if (normalizedMap.current[combined]) { foundId = normalizedMap.current[combined]; break; }
        }
      }

      if (foundId) {
        handleDetect(foundId);
      } else {
        setError('No se pudo detectar el número de la figurita en la foto.');
        setStatus('idle');
      }

    } catch (err) {
      console.error("OCR Photo Error:", err);
      setError('Ocurrió un error al procesar la imagen.');
      setStatus('idle');
    }
  };

  // --- MANUAL MODE ---
  useEffect(() => {
    if (!manualInput.trim()) { setSuggestions([]); return; }
    const q = manualInput.replace(/\s/g, '').toUpperCase();
    const found = validIds
      .filter(id => id.replace(/\s/g, '').toUpperCase().includes(q))
      .slice(0, 8);
    setSuggestions(found);
  }, [manualInput, validIds]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="relative w-full max-w-lg bg-[#0D0D0D] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 flex justify-between items-center border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <Camera className="h-5 w-5 text-[#2A398D]" />
            <h2 className="font-bold text-white text-sm">Escáner de Figuritas</h2>
          </div>
          <div className="flex items-center gap-2">
            {(mode === 'camera' || mode === 'photo') && (
              <button
                onClick={() => { stopCamera(); setMode('manual'); setManualInput(''); }}
                className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-white/10 text-white/60 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-1.5"
              >
                <Type className="h-3 w-3" /> Manual
              </button>
            )}
            {mode === 'manual' && (
              <button
                onClick={() => {
                  setManualInput(''); 
                  setSuggestions([]);
                  if ('TextDetector' in window) setMode('camera');
                  else setMode('photo');
                }}
                className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-white/10 text-white/60 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-1.5"
              >
                <Camera className="h-3 w-3" /> Cámara
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white/60 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {mode === 'checking' && (
          <div className="flex-1 min-h-[200px] flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-[#2A398D] animate-spin" />
          </div>
        )}

        {/* ---- ANDROID CAMERA MODE ---- */}
        {mode === 'camera' && (
          <div className="relative flex-1 min-h-[300px] bg-black flex items-center justify-center overflow-hidden">
            {error && (
              <div className="p-8 text-center z-10 absolute inset-0 bg-black flex flex-col items-center justify-center">
                <AlertCircle className="h-12 w-12 text-[#E61D25] mb-4" />
                <p className="text-white text-sm mb-6">{error}</p>
                <button onClick={startCamera} className="bg-[#2A398D] text-white px-6 py-2 rounded-xl font-bold text-sm flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" /> Reintentar
                </button>
              </div>
            )}

            {!isCameraReady && !error && (
              <div className="z-10 flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 text-[#2A398D] animate-spin" />
                <p className="text-white/70 text-sm font-medium">Iniciando cámara...</p>
              </div>
            )}

            <video
              ref={videoRef}
              playsInline autoPlay muted
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${isCameraReady ? 'opacity-100' : 'opacity-0'}`}
            />

            {isCameraReady && !error && (
              <>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative w-64 h-28 border-2 border-white/20 rounded-xl">
                    <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-[#2A398D] rounded-tl-md" />
                    <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-[#2A398D] rounded-tr-md" />
                    <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-[#2A398D] rounded-bl-md" />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-[#2A398D] rounded-br-md" />
                    <motion.div
                      animate={{ top: ['0%', '100%', '0%'] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      className="absolute left-0 right-0 h-0.5 bg-[#2A398D] shadow-[0_0_8px_#2A398D]"
                    />
                  </div>
                </div>

                <div className="absolute bottom-4 left-4 right-4 flex justify-center z-20">
                  <AnimatePresence mode="wait">
                    {status === 'scanning' && (
                      <motion.div key="s" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="bg-black/70 backdrop-blur-md px-4 py-1.5 rounded-full flex items-center gap-2 border border-white/10">
                        <Loader2 className="h-3 w-3 text-[#2A398D] animate-spin" />
                        <span className="text-white text-[10px] font-bold uppercase tracking-widest">Leyendo...</span>
                      </motion.div>
                    )}
                    {status === 'success' && (
                      <motion.div key="ok" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                        className="bg-[#3CAC3B] px-6 py-2 rounded-full flex items-center gap-2 shadow-lg">
                        <CheckCircle2 className="h-5 w-5 text-white" />
                        <span className="text-white font-black uppercase italic text-lg">{detectedId}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}
          </div>
        )}

        {/* ---- iOS PHOTO FALLBACK MODE ---- */}
        {mode === 'photo' && (
          <div className="flex-1 flex flex-col p-6 min-h-[300px] relative items-center justify-center bg-[#1A1A1A]">
            
            {!photoPreview ? (
              <div className="text-center w-full">
                <div className="w-20 h-20 bg-[#2A398D]/20 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-[#2A398D]/30">
                  <ImageIcon className="h-8 w-8 text-[#2A398D]" />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">Escanear Foto</h3>
                <p className="text-white/60 text-sm mb-8 px-4">
                  En iPhone, toma una foto de la figurita (o súbela de tu galería) y nosotros extraeremos el número.
                </p>
                
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  id="cameraInput"
                  className="hidden"
                  onChange={handlePhotoCapture}
                />
                <label 
                  htmlFor="cameraInput"
                  className="w-full flex items-center justify-center gap-3 bg-[#2A398D] text-white py-4 rounded-xl font-bold uppercase tracking-wider text-sm shadow-lg hover:bg-[#3CAC3B] transition-colors cursor-pointer active:scale-95"
                >
                  <Camera className="h-5 w-5" /> Abrir Cámara
                </label>

                <p className="text-white/40 text-[10px] mt-6">
                  💡 Tip: También puedes usar el modo Manual y aprovechar la herramienta "Escanear Texto" del teclado de tu iPhone.
                </p>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center relative">
                <div className="relative w-full aspect-[3/4] max-h-[300px] rounded-xl overflow-hidden mb-6 border border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoPreview} alt="Captura" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                  
                  {/* Progress overlay */}
                  {status === 'scanning' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                      <div className="bg-black/80 backdrop-blur-md p-6 rounded-2xl border border-[#2A398D]/50 w-full text-center">
                        <Loader2 className="h-8 w-8 text-[#2A398D] animate-spin mx-auto mb-4" />
                        <p className="text-white font-bold text-sm uppercase tracking-wider mb-2">{ocrMessage}</p>
                        <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${ocrProgress}%` }}
                            className="h-full bg-[#2A398D]"
                          />
                        </div>
                        <p className="text-[#2A398D] text-xs font-black mt-2">{ocrProgress}%</p>
                      </div>
                    </div>
                  )}

                  {status === 'success' && (
                    <div className="absolute inset-0 flex items-center justify-center p-6">
                      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#3CAC3B] px-8 py-4 rounded-full flex flex-col items-center gap-2 shadow-2xl">
                        <CheckCircle2 className="h-8 w-8 text-white" />
                        <span className="text-white font-black uppercase italic text-2xl">{detectedId}</span>
                      </motion.div>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="bg-[#E61D25]/10 border border-[#E61D25]/30 p-4 rounded-xl text-center w-full mb-4">
                    <p className="text-[#E61D25] text-sm font-bold">{error}</p>
                  </div>
                )}

                {status === 'idle' && (
                  <div className="flex gap-4 w-full">
                    <button 
                      onClick={() => setPhotoPreview(null)}
                      className="flex-1 py-3 bg-white/5 text-white/80 rounded-xl font-bold uppercase text-xs tracking-wider border border-white/10"
                    >
                      Cancelar
                    </button>
                    <label 
                      htmlFor="cameraInput"
                      className="flex-1 py-3 bg-[#2A398D] text-white rounded-xl font-bold uppercase text-xs tracking-wider text-center shadow-lg"
                    >
                      Reintentar
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ---- MANUAL MODE ---- */}
        {mode === 'manual' && (
          <div className="flex-1 flex flex-col p-5 gap-4 overflow-hidden">
            <div className="text-center py-2">
              <Search className="h-10 w-10 text-[#2A398D] mx-auto mb-2" />
              <p className="text-white font-bold">Búsqueda rápida</p>
              <p className="text-white/50 text-xs mt-1">Escribe el número de la figurita</p>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <input
                type="text"
                autoFocus
                placeholder="ej. ARG 1, FWC 22..."
                value={manualInput}
                onChange={e => setManualInput(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl pl-9 pr-4 py-3 focus:outline-none focus:border-[#2A398D] placeholder:text-white/20 text-sm font-medium"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1">
              {suggestions.length === 0 && manualInput.length > 0 && (
                <p className="text-white/30 text-xs text-center py-8">No se encontraron resultados</p>
              )}
              {suggestions.map(id => (
                <button
                  key={id}
                  onClick={() => { handleDetect(id); onClose(); }}
                  className="w-full text-left px-4 py-3 rounded-xl bg-white/5 hover:bg-[#2A398D]/30 border border-white/5 hover:border-[#2A398D]/40 transition-all group flex items-center justify-between"
                >
                  <span className="text-white font-bold text-sm">{id}</span>
                  <span className="text-white/30 text-[10px] font-bold uppercase tracking-wider group-hover:text-[#2A398D] transition-colors">Seleccionar →</span>
                </button>
              ))}
            </div>
          </div>
        )}

      </motion.div>
    </div>
  );
}
