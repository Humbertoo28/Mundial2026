'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, X, Loader2, CheckCircle2, AlertCircle, RefreshCw, Search, Type, Image as ImageIcon, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Extend Window type for TextDetector
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectorRef = useRef<any>(null);
  const workerRef = useRef<any>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [mode, setMode] = useState<'camera' | 'photo' | 'manual'>('camera');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isWorkerLoading, setIsWorkerLoading] = useState(false);
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success'>('idle');
  const [detectedId, setDetectedId] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  const [manualInput, setManualInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Pre-normalize valid IDs
  const normalizedMap = useRef<Record<string, string>>({});
  useEffect(() => {
    const map: Record<string, string> = {};
    validIds.forEach(id => {
      map[id.replace(/\s/g, '').toUpperCase()] = id;
    });
    normalizedMap.current = map;
  }, [validIds]);

  const initTesseract = async () => {
    if (isWorkerReady || isWorkerLoading) return;
    setIsWorkerLoading(true);
    setLoadingProgress(0);
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng', 1, {
        logger: m => {
          if (m.status.includes('loading') || m.status.includes('recognizing')) {
            setLoadingProgress(Math.round(m.progress * 100));
          }
        },
        langPath: 'https://tessdata.projectnaptha.com/4.0.0_fast',
      });
      await worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ',
        tessedit_pageseg_mode: '1' as any,
      });
      workerRef.current = worker;
      setIsWorkerReady(true);
    } catch (err) {
      console.error("Tesseract Init Error:", err);
      setError("No se pudo cargar el motor de IA.");
    } finally {
      setIsWorkerLoading(false);
    }
  };

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            setIsCameraActive(true);
            // Detect native support
            if ('TextDetector' in window && !detectorRef.current) {
              try { detectorRef.current = new window.TextDetector(); } catch(e) {}
            }
            // If no native support, auto-start Tesseract load
            if (!detectorRef.current) {
              initTesseract();
            }
          });
        };
      }
    } catch (err) {
      console.error("Camera Error:", err);
      setError("No se pudo acceder a la cámara.");
    }
  };

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    setIsCameraActive(false);
  }, []);

  useEffect(() => {
    if (isOpen && mode === 'camera') startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [isOpen, mode, stopCamera]);

  const processFrame = useCallback(async () => {
    if (!isCameraActive || status !== 'idle' || !videoRef.current) return;
    
    const video = videoRef.current;
    if (video.videoWidth === 0) return;

    let foundId: string | null = null;
    setStatus('scanning');

    try {
      if (detectorRef.current) {
        // FAST: Native Android/Chrome
        const results = await detectorRef.current.detect(video);
        for (const res of results) {
          const words = res.rawValue.toUpperCase().replace(/[^A-Z0-9\s]/g, '').split(/\s+/);
          for (const w of words) { if (normalizedMap.current[w]) { foundId = normalizedMap.current[w]; break; } }
          if (!foundId) {
            for (let i = 0; i < words.length - 1; i++) {
              const combined = words[i] + words[i+1];
              if (normalizedMap.current[combined]) { foundId = normalizedMap.current[combined]; break; }
            }
          }
          if (foundId) break;
        }
      } else if (isWorkerReady && workerRef.current && canvasRef.current) {
        // FALLBACK: Tesseract (iOS/Older Android)
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (context) {
          const targetW = 400; const targetH = 160;
          canvas.width = targetW; canvas.height = targetH;
          context.drawImage(video, (video.videoWidth-targetW)/2, (video.videoHeight-targetH)/2, targetW, targetH, 0, 0, targetW, targetH);
          const { data: { text } } = await workerRef.current.recognize(canvas);
          const words = text.toUpperCase().replace(/[^A-Z0-9\s]/g, '').split(/\s+/);
          for (const w of words) { if (normalizedMap.current[w]) { foundId = normalizedMap.current[w]; break; } }
          if (!foundId) {
            for (let i = 0; i < words.length - 1; i++) {
              const combined = words[i] + words[i+1];
              if (normalizedMap.current[combined]) { foundId = normalizedMap.current[combined]; break; }
            }
          }
        }
      }

      if (foundId) {
        setDetectedId(foundId);
        setStatus('success');
        onDetected(foundId);
        setTimeout(() => { setStatus('idle'); setDetectedId(null); }, 3000);
      } else {
        setStatus('idle');
      }
    } catch (err) {
      setStatus('idle');
    }
  }, [isCameraActive, isWorkerReady, status, onDetected]);

  useEffect(() => {
    if (!isCameraActive || mode !== 'camera') return;
    const interval = detectorRef.current ? 600 : 1500; // Native is faster
    scanIntervalRef.current = setInterval(processFrame, interval);
    return () => { if (scanIntervalRef.current) clearInterval(scanIntervalRef.current); };
  }, [isCameraActive, mode, processFrame]);

  // Photo mode handler
  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
    setStatus('scanning');
    
    if (!isWorkerReady) await initTesseract();
    if (!workerRef.current) { setError("Error cargando IA"); return; }
    
    try {
      const { data: { text } } = await workerRef.current.recognize(url);
      const words = text.toUpperCase().replace(/[^A-Z0-9\s]/g, '').split(/\s+/);
      let found: string | null = null;
      for (const w of words) { if (normalizedMap.current[w]) { found = normalizedMap.current[w]; break; } }
      if (!found) {
        for (let i = 0; i < words.length - 1; i++) {
          const combined = words[i] + words[i+1];
          if (normalizedMap.current[combined]) { found = normalizedMap.current[combined]; break; }
        }
      }
      if (found) {
        setDetectedId(found);
        setStatus('success');
        onDetected(found);
        setTimeout(() => { setStatus('idle'); setPhotoPreview(null); }, 2500);
      } else {
        setError("No se detectó número. Intenta de nuevo.");
        setStatus('idle');
      }
    } catch (e) { setStatus('idle'); setError("Error procesando foto"); }
  };

  useEffect(() => {
    if (!manualInput.trim()) { setSuggestions([]); return; }
    const q = manualInput.replace(/\s/g, '').toUpperCase();
    const found = validIds.filter(id => id.replace(/\s/g, '').toUpperCase().includes(q)).slice(0, 8);
    setSuggestions(found);
  }, [manualInput, validIds]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
        className="relative w-full max-w-lg bg-[#0D0D0D] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">
        
        {/* Header */}
        <div className="p-4 flex justify-between items-center border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-[#2A398D]/20 p-1.5 rounded-lg">
              <Camera className="h-4 w-4 text-[#2A398D]" />
            </div>
            <h2 className="font-bold text-white text-xs uppercase tracking-widest">Escáner</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setMode('camera')} className={`p-2 rounded-lg transition-colors ${mode === 'camera' ? 'bg-[#2A398D] text-white' : 'text-white/40 hover:bg-white/5'}`}><Camera className="h-4 w-4" /></button>
            <button onClick={() => setMode('photo')} className={`p-2 rounded-lg transition-colors ${mode === 'photo' ? 'bg-[#2A398D] text-white' : 'text-white/40 hover:bg-white/5'}`}><ImageIcon className="h-4 w-4" /></button>
            <button onClick={() => setMode('manual')} className={`p-2 rounded-lg transition-colors ${mode === 'manual' ? 'bg-[#2A398D] text-white' : 'text-white/40 hover:bg-white/5'}`}><Search className="h-4 w-4" /></button>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white/60"><X className="h-5 w-5" /></button>
          </div>
        </div>

        {/* Viewport */}
        <div className="relative flex-1 min-h-[350px] bg-black flex items-center justify-center overflow-hidden">
          {mode === 'camera' && (
            <>
              <video ref={videoRef} playsInline autoPlay muted className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${isCameraActive ? 'opacity-100' : 'opacity-0'}`} />
              
              {!isCameraActive && !error && (
                <div className="z-10 flex flex-col items-center gap-4">
                  <Loader2 className="h-10 w-10 text-[#2A398D] animate-spin" />
                  <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Iniciando Lente...</p>
                </div>
              )}

              {error && (
                <div className="z-10 p-8 text-center flex flex-col items-center">
                  <AlertCircle className="h-12 w-12 text-[#E61D25] mb-4" />
                  <p className="text-white text-sm mb-6">{error}</p>
                  <button onClick={startCamera} className="bg-[#2A398D] text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg"><RefreshCw className="h-4 w-4" /> Reintentar</button>
                </div>
              )}

              {isCameraActive && !isWorkerReady && !detectorRef.current && isWorkerLoading && (
                <div className="absolute top-4 left-4 right-4 z-30">
                  <div className="bg-black/80 backdrop-blur-md p-3 rounded-2xl border border-[#2A398D]/30">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin text-[#2A398D]" /> Cargando IA...</span>
                      <span className="text-[#2A398D] text-[10px] font-black">{loadingProgress}%</span>
                    </div>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${loadingProgress}%` }} className="h-full bg-[#2A398D]" /></div>
                  </div>
                </div>
              )}

              {isCameraActive && (
                <>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative w-64 h-32 border-2 border-white/20 rounded-2xl">
                      <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-[#2A398D] rounded-tl-xl" />
                      <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-[#2A398D] rounded-tr-xl" />
                      <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-[#2A398D] rounded-bl-xl" />
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-[#2A398D] rounded-br-xl" />
                      <motion.div animate={{ top: ['0%', '100%', '0%'] }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} className="absolute left-0 right-0 h-0.5 bg-[#2A398D] shadow-[0_0_15px_#2A398D]" />
                    </div>
                  </div>
                  <div className="absolute bottom-6 left-4 right-4 flex justify-center z-20">
                    <AnimatePresence mode="wait">
                      {status === 'scanning' && (
                        <motion.div key="s" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
                          <Zap className={`h-3 w-3 ${detectorRef.current ? 'text-[#3CAC3B]' : 'text-[#2A398D]'} animate-pulse`} />
                          <span className="text-white text-[10px] font-black uppercase tracking-widest">{detectorRef.current ? 'Escaneo Nativo Activo' : 'Escaneando con IA...'}</span>
                        </motion.div>
                      )}
                      {status === 'success' && (
                        <motion.div key="ok" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#3CAC3B] px-8 py-3 rounded-full shadow-2xl flex items-center gap-3 border-2 border-white/20">
                          <CheckCircle2 className="h-6 w-6 text-white" />
                          <span className="text-white font-black italic text-2xl tracking-tighter">{detectedId}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}
            </>
          )}

          {mode === 'photo' && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0D0D0D]">
              {!photoPreview ? (
                <div className="text-center">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
                    <ImageIcon className="h-8 w-8 text-white/20" />
                  </div>
                  <h3 className="text-white font-bold mb-2">Escanear desde Foto</h3>
                  <p className="text-white/40 text-xs mb-8 max-w-[200px] mx-auto uppercase tracking-wider font-bold">Ideal para iPhone o lugares con poca luz</p>
                  <input type="file" accept="image/*" capture="environment" id="photoIn" className="hidden" onChange={handlePhoto} />
                  <label htmlFor="photoIn" className="bg-[#2A398D] text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl cursor-pointer hover:bg-[#3CAC3B] transition-all flex items-center gap-3 active:scale-95"><Camera className="h-4 w-4" /> Tomar Foto</label>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center">
                  <div className="relative w-full aspect-square rounded-3xl overflow-hidden mb-6 border border-white/10">
                    <img src={photoPreview} className="w-full h-full object-cover opacity-40 blur-sm" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                      {status === 'scanning' ? (
                        <>
                          <Loader2 className="h-10 w-10 text-[#2A398D] animate-spin mb-4" />
                          <p className="text-white font-black uppercase tracking-widest text-xs mb-2">Procesando Imagen...</p>
                          <div className="w-full max-w-[150px] bg-white/10 h-1.5 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${loadingProgress}%` }} className="h-full bg-[#2A398D]" /></div>
                        </>
                      ) : status === 'success' ? (
                        <div className="bg-[#3CAC3B] px-8 py-4 rounded-2xl shadow-2xl flex flex-col items-center gap-2">
                          <CheckCircle2 className="h-10 w-10 text-white" />
                          <span className="text-white font-black italic text-3xl tracking-tighter">{detectedId}</span>
                        </div>
                      ) : (
                        <p className="text-white/60 text-sm font-bold uppercase">{error}</p>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setPhotoPreview(null)} className="text-white/40 font-bold uppercase tracking-widest text-[10px] hover:text-white transition-colors">Cancelar y Reintentar</button>
                </div>
              )}
            </div>
          )}

          {mode === 'manual' && (
            <div className="flex-1 flex flex-col p-6 gap-6 bg-[#0D0D0D]">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/20" />
                <input type="text" autoFocus placeholder="Escribe el número (ej. PAN 1)" value={manualInput} onChange={e => setManualInput(e.target.value)} className="w-full bg-white/5 border border-white/10 text-white rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-[#2A398D] placeholder:text-white/10 font-bold" />
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {suggestions.map(id => (
                  <button key={id} onClick={() => { onDetected(id); onClose(); }} className="w-full p-4 rounded-2xl bg-white/5 hover:bg-[#2A398D] text-white flex justify-between items-center transition-all group border border-white/5 hover:border-transparent">
                    <span className="font-black italic text-lg tracking-tighter">{id}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Seleccionar</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </motion.div>
    </div>
  );
}
