'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, X, Loader2, CheckCircle2, AlertCircle, Search, Image as ImageIcon, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getWorker, getOcrStatus, preloadOcrEngine } from '@/lib/ocrEngine';

// Extension for Native Shape Detection API (Android/Chrome)
declare global {
  interface Window {
    TextDetector: any;
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
  const scanTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingRef = useRef(false);
  const nativeDetectorRef = useRef<any>(null);

  const [mode, setMode] = useState<'camera' | 'photo' | 'manual'>('camera');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [ocrReady, setOcrReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedId, setDetectedId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [useNative, setUseNative] = useState(false);

  const [manualInput, setManualInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Pre-normalize valid IDs for matching
  const normalizedMap = useRef<Record<string, string>>({});
  useEffect(() => {
    const map: Record<string, string> = {};
    validIds.forEach(id => {
      map[id.replace(/\s/g, '').toUpperCase()] = id;
    });
    normalizedMap.current = map;
  }, [validIds]);

  // Check for native TextDetector support
  useEffect(() => {
    if (typeof window !== 'undefined' && 'TextDetector' in window) {
      try {
        nativeDetectorRef.current = new window.TextDetector();
        setUseNative(true);
        console.log('[Scanner] Native TextDetector enabled');
      } catch (e) {
        console.error('[Scanner] Native detector failed to init');
      }
    }
  }, []);

  const matchText = useCallback((text: string): string | null => {
    if (!text) return null;
    
    // 1. Limpieza agresiva: Solo letras y números, todo en mayúsculas
    const cleanText = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // 2. Correcciones comunes de OCR (errores típicos de la IA)
    const normalizedText = cleanText
      .replace(/P0R/g, 'POR')
      .replace(/PQ R/g, 'POR')
      .replace(/PQR/g, 'POR')
      .replace(/F0R/g, 'POR')
      .replace(/0/g, 'O') // Solo si está en la parte de letras (esto es arriesgado, mejor por partes)
      .replace(/I/g, '1')
      .replace(/L/g, '1');

    console.log('[Scanner] Raw text cleaned:', cleanText);

    // 3. Intento de match directo con limpieza
    if (normalizedMap.current[cleanText]) return normalizedMap.current[cleanText];

    // 4. Buscar patrones de 3 letras + números en el texto sucio
    const pattern = /([A-Z]{3}|[A-Z0-9]{3})\s*(\d+)/g;
    let match;
    while ((match = pattern.exec(text.toUpperCase())) !== null) {
      let prefix = match[1].replace(/0/g, 'O').replace(/1/g, 'I'); // Corregir letras
      let num = match[2];
      const candidate = (prefix + num).replace(/\s/g, '');
      
      if (normalizedMap.current[candidate]) return normalizedMap.current[candidate];
      
      // Probar variaciones comunes
      const variations = [
        candidate.replace('P0R', 'POR').replace('PQR', 'POR').replace('F0R', 'POR'),
        candidate.replace('ARG', 'ARG').replace('AR6', 'ARG')
      ];
      
      for (const v of variations) {
        if (normalizedMap.current[v]) return normalizedMap.current[v];
      }
    }

    // 5. Búsqueda por palabras con corrección individual
    const words = text.toUpperCase().split(/\s+/).filter(w => w.length >= 2);
    for (const w of words) {
      const cw = w.replace(/[^A-Z0-9]/g, '')
                 .replace('P0R', 'POR')
                 .replace('PQR', 'POR');
      if (normalizedMap.current[cw]) return normalizedMap.current[cw];
    }

    return null;
  }, []);

  // ---- CAMERA ----
  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise<void>((resolve) => {
          videoRef.current!.onloadedmetadata = () => {
            videoRef.current!.play().then(() => {
              setIsCameraActive(true);
              resolve();
            });
          };
        });
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
    if (scanTimerRef.current) { clearTimeout(scanTimerRef.current); scanTimerRef.current = null; }
    setIsCameraActive(false);
    isProcessingRef.current = false;
  }, []);

  useEffect(() => {
    if (isOpen && mode === 'camera') startCamera();
    if (!isOpen) stopCamera();
    return () => stopCamera();
  }, [isOpen, mode, stopCamera]);

  // Scan loop
  const scanFrame = useCallback(async () => {
    if (!isCameraActive || isProcessingRef.current || detectedId) return;
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;

    isProcessingRef.current = true;
    setIsScanning(true);

    // Mejoramos el procesamiento de la imagen para que sea más nítida
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) { isProcessingRef.current = false; return; }

    // Área de recorte más inteligente (centro expandido)
    const cropW = Math.min(600, video.videoWidth);
    const cropH = Math.min(250, video.videoHeight);
    canvas.width = cropW;
    canvas.height = cropH;
    
    // Dibujar y aplicar filtros de imagen básicos para OCR
    ctx.filter = 'contrast(1.4) brightness(1.1) grayscale(1)';
    ctx.drawImage(
      video,
      (video.videoWidth - cropW) / 2, (video.videoHeight - cropH) / 2,
      cropW, cropH,
      0, 0, cropW, cropH
    );
    ctx.filter = 'none';

    try {
      let found: string | null = null;

      if (useNative && nativeDetectorRef.current) {
        const results = await nativeDetectorRef.current.detect(canvas); // Usamos el canvas procesado
        for (const res of results) {
          found = matchText(res.rawValue);
          if (found) break;
        }
      } 

      if (found) {
        setDetectedId(found);
        setIsScanning(false);
        onDetected(found);
        setTimeout(() => { setDetectedId(null); }, 3000);
        isProcessingRef.current = false;
        return;
      }
    } catch (e) {
      console.error('[Scanner] Frame error:', e);
    }

    setIsScanning(false);
    isProcessingRef.current = false;
  }, [isCameraActive, detectedId, onDetected, useNative, matchText]);

  useEffect(() => {
    if (!isCameraActive || mode !== 'camera') return;
    // Si no es nativo, ni siquiera intentamos el loop porque no hay motor de IA en vivo.
    if (!useNative) return;
    
    const loop = () => {
      scanFrame();
      scanTimerRef.current = setTimeout(loop, 600);
    };
    scanTimerRef.current = setTimeout(loop, 500);
    return () => { if (scanTimerRef.current) clearTimeout(scanTimerRef.current); };
  }, [isCameraActive, mode, scanFrame, useNative]);

  // ---- PHOTO (Using Fast Cloud OCR to avoid downloads) ----
  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsScanning(true);
    setError(null);

    // Crear preview local
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);

    try {
      // 1. Redimensionar imagen para que sea ligera y la API no falle
      const img = new Image();
      img.src = url;
      await new Promise((resolve) => (img.onload = resolve));

      const canvasComp = document.createElement('canvas');
      const MAX_WIDTH = 1200; // Suficiente para OCR pero ligero
      let width = img.width;
      let height = img.height;

      if (width > MAX_WIDTH) {
        height = (MAX_WIDTH / width) * height;
        width = MAX_WIDTH;
      }

      canvasComp.width = width;
      canvasComp.height = height;
      const ctxComp = canvasComp.getContext('2d');
      ctxComp?.drawImage(img, 0, 0, width, height);

      // Convertir a Blob comprimido (JPEG 0.7 es perfecto para OCR)
      const compressedBlob = await new Promise<Blob>((resolve) => 
        canvasComp.toBlob((b) => resolve(b!), 'image/jpeg', 0.7)
      );

      // 2. Enviar a la API
      const formData = new FormData();
      formData.append('file', compressedBlob, 'photo.jpg');
      formData.append('apikey', 'K81165445888957'); 
      formData.append('language', 'eng');
      formData.append('scale', 'true');
      formData.append('OCREngine', '2'); // Motor más rápido

      const response = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.OCRExitCode === 1) {
        const text = result.ParsedResults[0]?.ParsedText || '';
        const found = matchText(text);
        if (found) {
          setDetectedId(found);
          onDetected(found);
          setTimeout(() => { setDetectedId(null); setPhotoPreview(null); }, 2500);
        } else {
          setError('No se detectó el código. Asegúrate que el código (ej: POR 14) esté centrado y nítido.');
        }
      } else {
        setError('El servidor de IA está saturado. Reintenta en 5 segundos.');
      }
    } catch (err) { 
      console.error('[Cloud OCR] Error:', err);
      setError('Error de conexión. Intenta tomar la foto con más luz.'); 
    }
    setIsScanning(false);
  };

  // ---- MANUAL ----
  useEffect(() => {
    if (!manualInput.trim()) { setSuggestions([]); return; }
    const q = manualInput.replace(/\s/g, '').toUpperCase();
    setSuggestions(validIds.filter(id => id.replace(/\s/g, '').toUpperCase().includes(q)).slice(0, 8));
  }, [manualInput, validIds]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-lg bg-[#0D0D0D] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">

        {/* Header */}
        <div className="p-3 flex justify-between items-center border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-[#2A398D]/20 p-1.5 rounded-lg"><Camera className="h-4 w-4 text-[#2A398D]" /></div>
            <h2 className="font-bold text-white text-xs uppercase tracking-widest">Escáner</h2>
            {useNative && mode === 'camera' && (
              <span className="bg-[#3CAC3B]/20 text-[#3CAC3B] text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-[#3CAC3B]/30 flex items-center gap-1">
                <Zap className="h-2 w-2" /> Nativo
              </span>
            )}
            {!useNative && mode === 'camera' && (
              <span className="bg-[#E61D25]/20 text-[#E61D25] text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-[#E61D25]/30">No Soportado</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setMode('camera')} className={`p-2 rounded-lg transition-all ${mode === 'camera' ? 'bg-[#2A398D] text-white' : 'text-white/30 hover:bg-white/5'}`}><Camera className="h-4 w-4" /></button>
            <button onClick={() => setMode('photo')} className={`p-2 rounded-lg transition-all ${mode === 'photo' ? 'bg-[#2A398D] text-white' : 'text-white/30 hover:bg-white/5'}`}><ImageIcon className="h-4 w-4" /></button>
            <button onClick={() => setMode('manual')} className={`p-2 rounded-lg transition-all ${mode === 'manual' ? 'bg-[#2A398D] text-white' : 'text-white/30 hover:bg-white/5'}`}><Search className="h-4 w-4" /></button>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white/40"><X className="h-5 w-5" /></button>
          </div>
        </div>

        {/* Viewport */}
        <div className="relative flex-1 min-h-[350px] bg-black flex items-center justify-center overflow-hidden">
          {mode === 'camera' && (
            <>
              <video ref={videoRef} playsInline autoPlay muted className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isCameraActive ? 'opacity-100' : 'opacity-0'}`} />
              
              {!isCameraActive && !error && (
                <div className="z-10 flex flex-col items-center gap-3">
                  <Loader2 className="h-10 w-10 text-[#2A398D] animate-spin" />
                  <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Iniciando...</p>
                </div>
              )}

              {isCameraActive && !useNative && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-sm p-8 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="bg-[#E61D25]/20 p-4 rounded-full">
                      <Camera className="h-8 w-8 text-[#E61D25]" />
                    </div>
                    <p className="text-white text-sm font-bold leading-relaxed">
                      El escaneo en vivo no está soportado en este dispositivo (iOS/Safari).<br/><br/>
                      Toca el ícono de <span className="text-[#3CAC3B]">FOTO</span> arriba para escanear al instante.
                    </p>
                    <button onClick={() => setMode('photo')} className="mt-4 bg-[#3CAC3B] text-white px-6 py-2 rounded-full font-black uppercase text-xs">
                      Ir a Modo Foto
                    </button>
                  </div>
                </div>
              )}

              {isCameraActive && (
                <>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div className="relative w-64 h-32 border-2 border-white/20 rounded-2xl">
                      <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-[#2A398D] rounded-tl-xl" />
                      <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-[#2A398D] rounded-tr-xl" />
                      <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-[#2A398D] rounded-bl-xl" />
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-[#2A398D] rounded-br-xl" />
                      <motion.div animate={{ top: ['0%', '100%', '0%'] }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        className={`absolute left-0 right-0 h-0.5 ${useNative ? 'bg-[#3CAC3B] shadow-[0_0_15px_#3CAC3B]' : 'bg-[#2A398D] shadow-[0_0_15px_#2A398D]'}`} />
                    </div>
                  </div>

                  <div className="absolute bottom-5 left-4 right-4 flex justify-center z-20">
                    <AnimatePresence mode="wait">
                      {isScanning && !detectedId && (
                        <motion.div key="s" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-black/60 backdrop-blur px-4 py-2 rounded-full border border-white/10 flex items-center gap-2">
                          <Zap className={`h-3 w-3 ${useNative ? 'text-[#3CAC3B]' : 'text-[#2A398D]'} animate-pulse`} />
                          <span className="text-white text-[10px] font-black uppercase tracking-widest">Escaneando...</span>
                        </motion.div>
                      )}
                      {detectedId && (
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
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0D0D0D] min-h-[350px]">
              {!photoPreview ? (
                <div className="text-center">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
                    <ImageIcon className="h-8 w-8 text-white/20" />
                  </div>
                  <h3 className="text-white font-bold mb-1">Escanear Foto</h3>
                  <input type="file" accept="image/*" capture="environment" id="photoIn" className="hidden" onChange={handlePhoto} />
                  <label htmlFor="photoIn" className="bg-[#2A398D] text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl cursor-pointer hover:bg-[#3CAC3B] transition-all flex items-center gap-3 active:scale-95 justify-center mt-6">
                    <Camera className="h-4 w-4" /> Tomar Foto
                  </label>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center">
                  <div className="relative w-full aspect-square rounded-2xl overflow-hidden mb-4 border border-white/10 max-h-[300px]">
                    <img src={photoPreview} className={`w-full h-full object-cover ${isScanning ? 'opacity-40 blur-sm' : ''}`} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      {isScanning && <Loader2 className="h-10 w-10 text-[#2A398D] animate-spin" />}
                      {detectedId && (
                        <div className="bg-[#3CAC3B] px-6 py-3 rounded-full shadow-xl flex items-center gap-2">
                          <CheckCircle2 className="h-6 w-6 text-white" />
                          <span className="text-white font-black italic text-xl">{detectedId}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {error && <p className="text-[#E61D25] text-xs font-bold mb-4 text-center px-4">{error}</p>}
                  {!isScanning && !detectedId && (
                    <button onClick={() => { setPhotoPreview(null); setError(null); }} className="text-white/40 text-[10px] font-bold uppercase tracking-widest hover:text-white">Reintentar</button>
                  )}
                </div>
              )}
            </div>
          )}

          {mode === 'manual' && (
            <div className="flex-1 flex flex-col p-5 gap-4 bg-[#0D0D0D] min-h-[350px]">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/20" />
                <input type="text" autoFocus placeholder="Escribe el código (ej. POR 14)" value={manualInput}
                  onChange={e => setManualInput(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-[#2A398D] placeholder:text-white/10 font-bold" />
              </div>
              <div className="flex-1 overflow-y-auto space-y-2">
                {suggestions.map(id => (
                  <button key={id} onClick={() => { onDetected(id); onClose(); }} className="w-full p-4 rounded-2xl bg-white/5 hover:bg-[#2A398D] text-white flex justify-between items-center transition-all group border border-white/5 hover:border-transparent">
                    <span className="font-black italic text-lg tracking-tighter">{id}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100">Seleccionar</span>
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
