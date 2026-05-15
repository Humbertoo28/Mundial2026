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
    
    const upperText = text.toUpperCase();
    
    // 1. Casos súper especiales directos
    // "00" se confunde con "OO", "O0", "0O", "88", "CO"
    if (upperText.match(/00|OO|O0|0O|88|CO/)) {
      if (normalizedMap.current['00']) return '00';
    }

    // 2. Limpieza básica
    const cleanText = upperText.replace(/[^A-Z0-9]/g, '');
    if (normalizedMap.current[cleanText]) return normalizedMap.current[cleanText];

    // 3. Patrones Inteligentes
    // FWC es difícil: F puede ser E/P, W puede ser V, C puede ser G
    const fwcMatch = upperText.match(/([EPF][WV][CG])\s*([0-9B S G I L]+)/);
    if (fwcMatch) {
      let num = fwcMatch[2].replace(/\s/g, '')
        .replace(/B/g, '8').replace(/S/g, '5').replace(/G/g, '6')
        .replace(/I/g, '1').replace(/L/g, '1').replace(/O/g, '0');
      
      const candidate = 'FWC' + num;
      if (normalizedMap.current[candidate]) return normalizedMap.current[candidate];
    }

    // 4. Patrón General: Prefijo + Número
    const pattern = /([A-Z]{2,4})\s*([0-9B S G I L]+)/g;
    let match;
    while ((match = pattern.exec(upperText)) !== null) {
      let prefix = match[1];
      let rawNum = match[2].replace(/\s/g, '');
      
      // Limpiar el número de errores comunes
      let num = rawNum
        .replace(/B/g, '8').replace(/S/g, '5').replace(/G/g, '6')
        .replace(/I/g, '1').replace(/L/g, '1').replace(/O/g, '0');

      // Correcciones de prefijos de países
      if (prefix.length === 3 && prefix !== 'FWC' && prefix !== 'CC') {
        prefix = prefix
          .replace(/0/g, 'O').replace(/1/g, 'I')
          .replace('8EL', 'BEL').replace('BE1', 'BEL')
          .replace('6ER', 'GER').replace('E5P', 'ESP')
          .replace('AR6', 'ARG');
      }
      
      const candidates = [
        prefix + num,
        num.length === 1 ? prefix + '0' + num : null,
        prefix + rawNum, // Probar también sin corregir el número por si acaso
      ].filter(Boolean) as string[];

      for (const c of candidates) {
        if (normalizedMap.current[c]) return normalizedMap.current[c];
      }
    }

    // 5. Búsqueda por palabras sueltas mejorada
    const words = upperText.split(/[^A-Z0-9]+/).filter(w => w.length >= 2);
    for (const w of words) {
      if (normalizedMap.current[w]) return normalizedMap.current[w];
      
      // Probar correcciones de prefijo pegado
      if (w.length >= 3) {
        const prefixPart = w.substring(0, 3).replace(/0/g, 'O').replace(/1/g, 'I');
        const numPart = w.substring(3);
        const corrected = prefixPart + numPart;
        if (normalizedMap.current[corrected]) return normalizedMap.current[corrected];
      }
    }

    return null;
  }, []);

  // ---- CAMERA ----
  const startCamera = async () => {
    if (isCameraActive) return;
    setError(null);
    setIsCameraActive(false);
    console.log('[Scanner] Intentando iniciar cámara...');
    
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Tu navegador no tiene acceso a la cámara. Asegúrate de usar Chrome o Samsung Internet y que el sitio sea HTTPS.');
      }

      // Intentamos con diferentes configuraciones de mayor a menor compatibilidad
      const attempts = [
        { video: { facingMode: 'environment' } }, // Primero lo más básico para asegurar compatibilidad
        { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } },
        { video: true }
      ];

      let stream: MediaStream | null = null;
      let lastErr: any = null;

      for (const constraints of attempts) {
        try {
          console.log('[Scanner] Probando constraints:', constraints);
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          if (stream) break;
        } catch (e) {
          console.warn('[Scanner] Falló intento:', constraints, e);
          lastErr = e;
        }
      }

      if (!stream) {
        throw lastErr || new Error('No se pudo obtener el flujo de video.');
      }

      console.log('[Scanner] Stream obtenido con éxito');

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Forzar play y manejar promesas
        try {
          // Algunos navegadores requieren load() antes de play()
          videoRef.current.load();
          
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Tiempo de espera agotado al conectar cámara.')), 10000);
            
            if (!videoRef.current) return;

            const handlePlay = async () => {
              clearTimeout(timeout);
              try {
                if (videoRef.current) {
                  await videoRef.current.play();
                  console.log('[Scanner] Video reproduciéndose');
                  setIsCameraActive(true);
                  resolve();
                }
              } catch (playErr) {
                reject(playErr);
              }
            };

            videoRef.current.onloadedmetadata = handlePlay;
            videoRef.current.oncanplay = handlePlay;
            
            videoRef.current.onerror = (e) => {
              clearTimeout(timeout);
              reject(new Error('Error en el elemento de video del sistema.'));
            };
          });
        } catch (playErr) {
          console.error('[Scanner] Error al reproducir video:', playErr);
          throw new Error('No se pudo iniciar la reproducción del video. Intenta refrescar la página.');
        }
      }
    } catch (err: any) {
      console.error('[Scanner] Error final de cámara:', err);
      let msg = 'Error al abrir la cámara.';
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.name === 'SecurityError') {
        msg = 'Permiso de cámara denegado. Ve a los ajustes del sitio en tu navegador y habilita la cámara.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No se detectó ninguna cámara en este dispositivo.';
      } else {
        msg = err.message || msg;
      }
      
      setError(msg);
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
        // Modo nativo (Android Chrome con flag activo)
        const results = await nativeDetectorRef.current.detect(canvas);
        for (const res of results) {
          found = matchText(res.rawValue);
          if (found) break;
        }
      } else {
        // Fallback: enviar frame al servidor OCR (funciona en cualquier dispositivo)
        const blob = await new Promise<Blob>((resolve) =>
          canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.8)
        );
        const formData = new FormData();
        formData.append('file', blob, 'frame.jpg');
        const response = await fetch('/api/ocr', { method: 'POST', body: formData });
        const result = await response.json();
        if (result.OCRExitCode === 1) {
          const text = result.ParsedResults?.[0]?.ParsedText || '';
          found = matchText(text);
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
    const interval = useNative ? 700 : 2500; // Nativo: rápido. Cloud: cada 2.5s para no saturar
    const loop = () => {
      scanFrame();
      scanTimerRef.current = setTimeout(loop, interval);
    };
    scanTimerRef.current = setTimeout(loop, 800);
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
      // 1. Redimensionar Imagen de forma inteligente (Sin Recortar)
      const img = new Image();
      img.src = url;
      await new Promise((resolve) => (img.onload = resolve));

      const canvasComp = document.createElement('canvas');
      
      const MAX_WIDTH = 1200;
      let width = img.width;
      let height = img.height;

      if (width > MAX_WIDTH) {
        height = (MAX_WIDTH / width) * height;
        width = MAX_WIDTH;
      }

      canvasComp.width = width;
      canvasComp.height = height;
      const ctxComp = canvasComp.getContext('2d');
      if (ctxComp) {
        // Filtro de alto contraste suave para no perder detalles si hay luz
        ctxComp.filter = 'grayscale(1) contrast(1.4) brightness(1.1)';
        ctxComp.drawImage(img, 0, 0, width, height);
        ctxComp.filter = 'none';
      }

      // Convertir a Blob comprimido (Calidad alta para texto)
      const compressedBlob = await new Promise<Blob>((resolve) => 
        canvasComp.toBlob((b) => resolve(b!), 'image/jpeg', 0.85)
      );

      // 2. Enviar a la API interna (para evitar bloqueos de CORS en iPhone)
      const formData = new FormData();
      formData.append('file', compressedBlob, 'photo.jpg');

      const response = await fetch('/api/ocr', {
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
              <span className="bg-yellow-500/20 text-yellow-400 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-yellow-500/30 flex items-center gap-1">
                <Zap className="h-2 w-2" /> Cloud
              </span>
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
          {/* ALWAYS render video to prevent null ref issues */}
          <video 
            ref={videoRef} 
            playsInline 
            autoPlay 
            muted 
            className="absolute inset-0 w-full h-full object-cover"
            style={{ 
              opacity: isCameraActive && mode === 'camera' ? 1 : 0.01,
              display: mode === 'camera' ? 'block' : 'none',
              pointerEvents: 'none'
            }}
          />

          {mode === 'camera' && (
            <>
              {!isCameraActive && !error && (
                <div className="z-10 flex flex-col items-center gap-3">
                  <div className="relative">
                    <Loader2 className="h-12 w-12 text-[#2A398D] animate-spin" />
                    <Camera className="absolute inset-0 m-auto h-5 w-5 text-white/50" />
                  </div>
                  <div className="text-center px-6">
                    <p className="text-white text-sm font-bold uppercase tracking-widest mb-1">Iniciando Cámara</p>
                    <p className="text-white/30 text-[10px] uppercase tracking-widest mb-4">Revisa si hay un aviso de permisos arriba o abajo</p>
                    <button 
                      onClick={() => {
                        stopCamera();
                        setTimeout(startCamera, 500);
                      }}
                      className="bg-[#2A398D] hover:bg-[#3CAC3B] text-white text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-full shadow-lg transition-all active:scale-95"
                    >
                      TOCA AQUÍ PARA FORZAR INICIO
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="z-20 absolute inset-0 flex flex-col items-center justify-center p-6 bg-black/90">
                  <AlertCircle className="h-12 w-12 text-[#E61D25] mb-4" />
                  <p className="text-white text-center font-bold text-sm mb-2">{error}</p>
                  <p className="text-white/50 text-center text-xs mb-6">En Android es necesario usar HTTPS para acceder a la cámara. Prueba usar el Modo Foto.</p>
                  <button onClick={() => setMode('photo')} className="bg-[#2A398D] text-white px-6 py-3 rounded-full font-black uppercase text-xs tracking-widest">
                    Ir al Modo Foto
                  </button>
                </div>
              )}

              {isCameraActive && !useNative && isScanning && (
                <div className="absolute top-3 left-3 right-3 z-30">
                  <div className="bg-black/70 backdrop-blur-md px-3 py-2 rounded-xl border border-yellow-500/30 flex items-center gap-2">
                    <Loader2 className="h-3 w-3 text-yellow-400 animate-spin" />
                    <span className="text-yellow-200 text-[10px] font-bold uppercase tracking-widest">Analizando...</span>
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
