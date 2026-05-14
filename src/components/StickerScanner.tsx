'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createWorker, Worker } from 'tesseract.js';
import { Camera, X, Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type StickerScannerProps = {
  isOpen: boolean;
  onClose: () => void;
  onDetected: (id: string) => void;
  validIds: string[];
};

export default function StickerScanner({ isOpen, onClose, onDetected, validIds }: StickerScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detectedId, setDetectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [initMessage, setInitMessage] = useState('Iniciando cámara...');

  // Pre-normalize valid IDs for easier matching
  const normalizedValidIds = useRef<Record<string, string>>({});
  useEffect(() => {
    const map: Record<string, string> = {};
    validIds.forEach(id => {
      map[id.replace(/\s/g, '').toUpperCase()] = id;
    });
    normalizedValidIds.current = map;
  }, [validIds]);

  const initWorker = async () => {
    try {
      if (!workerRef.current) {
        console.log("Initializing Tesseract worker...");
        // Use a faster configuration for numbers/uppercase AND tessdata_fast
        const worker = await createWorker('eng', 1, {
          logger: m => console.log(m.status, m.progress),
          workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@v5.0.0/dist/worker.min.js',
          corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@v5.0.0/tesseract-core.wasm.js',
          langPath: 'https://tessdata.projectnaptha.com/4.0.0_fast',
        });
        
        await worker.setParameters({
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ',
        });
        
        workerRef.current = worker;
      }
      setIsWorkerReady(true);
      return true;
    } catch (err) {
      console.error("Error initializing Tesseract:", err);
      // We don't block the camera if worker fails, but we show an error
      return false;
    }
  };

  const startCamera = async () => {
    setIsInitializing(true);
    setError(null);
    try {
      console.log("Requesting camera access...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', 
          width: { ideal: 1280 }, 
          height: { ideal: 720 } 
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play()
            .then(() => {
              setIsCameraReady(true);
              setIsInitializing(false);
              setInitMessage('Cargando motor de IA...');
            })
            .catch(e => {
              console.error("Play prevented", e);
              setError("Error al reproducir el video. Toca el botón para reintentar.");
            });
        };
      }

      // Initialize Tesseract in background
      initWorker();
      
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("No se pudo acceder a la cámara. Por favor, asegúrate de dar los permisos necesarios.");
      setIsInitializing(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraReady(false);
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  const processFrame = useCallback(async () => {
    if (!isCameraReady || !isWorkerReady || !videoRef.current || !canvasRef.current || status === 'success' || !workerRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return;

    const targetWidth = 400;
    const targetHeight = 200;
    const startX = (video.videoWidth - targetWidth) / 2;
    const startY = (video.videoHeight - targetHeight) / 2;

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    context.drawImage(video, startX, startY, targetWidth, targetHeight, 0, 0, targetWidth, targetHeight);

    setStatus('scanning');

    try {
      const { data: { text } } = await workerRef.current.recognize(canvas);

      const words = text.split(/\s+/);
      let foundId: string | null = null;

      for (const word of words) {
        const normalized = word.replace(/[^A-Z0-9]/gi, '').toUpperCase();
        if (normalizedValidIds.current[normalized]) {
          foundId = normalizedValidIds.current[normalized];
          break;
        }
      }

      if (!foundId) {
        for (let i = 0; i < words.length - 1; i++) {
          const combined = (words[i] + words[i+1]).replace(/[^A-Z0-9]/gi, '').toUpperCase();
          if (normalizedValidIds.current[combined]) {
            foundId = normalizedValidIds.current[combined];
            break;
          }
        }
      }

      if (foundId) {
        setDetectedId(foundId);
        setStatus('success');
        onDetected(foundId);
        setTimeout(() => {
          setStatus('idle');
          setDetectedId(null);
        }, 2000);
      } else {
        setStatus('idle');
      }
    } catch (err) {
      console.error("OCR Error:", err);
      setStatus('idle');
    }
  }, [isCameraReady, isWorkerReady, status, onDetected]);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    const runScan = async () => {
      if (isCameraReady && isWorkerReady && status === 'idle') {
        await processFrame();
      }
      timeout = setTimeout(runScan, 800);
    };

    if (isCameraReady && isWorkerReady && status === 'idle') {
      timeout = setTimeout(runScan, 800);
    }
    
    return () => clearTimeout(timeout);
  }, [isCameraReady, isWorkerReady, status, processFrame]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="relative w-full max-w-lg bg-[#0D0D0D] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="p-4 flex justify-between items-center border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-[#2A398D]" />
            <h2 className="font-bold text-white">Escáner de Figuritas</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/60"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative flex-1 min-h-[300px] bg-black flex items-center justify-center overflow-hidden">
          {isInitializing && (
            <div className="flex flex-col items-center gap-4 p-6 text-center z-10">
              <Loader2 className="h-10 w-10 text-[#2A398D] animate-spin mx-auto" />
              <p className="text-white/80 font-medium">{initMessage}</p>
            </div>
          )}
          
          {error && (
            <div className="p-8 text-center z-10 absolute inset-0 bg-black flex flex-col items-center justify-center">
              <AlertCircle className="h-12 w-12 text-[#E61D25] mx-auto mb-4" />
              <p className="text-white mb-6">{error}</p>
              <button 
                onClick={startCamera}
                className="flex items-center gap-2 mx-auto bg-[#2A398D] text-white px-6 py-2 rounded-xl font-bold"
              >
                <RefreshCw className="h-4 w-4" />
                Reintentar
              </button>
            </div>
          )}

          <video 
            ref={videoRef}
            playsInline 
            autoPlay
            muted 
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${isCameraReady ? 'opacity-100' : 'opacity-0'}`}
          />
          
          {isCameraReady && !isWorkerReady && !error && (
            <div className="absolute top-4 left-4 right-4 z-30">
              <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-[#2A398D]/30 flex items-center gap-3">
                <Loader2 className="h-4 w-4 text-[#2A398D] animate-spin" />
                <span className="text-white text-xs font-medium italic">Preparando Inteligencia Artificial...</span>
              </div>
            </div>
          )}

          {isCameraReady && isWorkerReady && !error && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-64 h-32 border-2 border-white/30 rounded-xl">
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-[#2A398D] rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-[#2A398D] rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-[#2A398D] rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-[#2A398D] rounded-br-lg" />
                
                <motion.div 
                  animate={{ top: ['0%', '100%', '0%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute left-0 right-0 h-0.5 bg-[#2A398D] shadow-[0_0_10px_#2A398D]"
                />
              </div>
            </div>
          )}

          {isCameraReady && isWorkerReady && !error && (
            <div className="absolute bottom-4 left-4 right-4 flex justify-center z-20">
              <AnimatePresence mode="wait">
                {status === 'scanning' && (
                  <motion.div 
                    key="scanning"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 border border-white/10"
                  >
                    <Loader2 className="h-4 w-4 text-[#2A398D] animate-spin" />
                    <span className="text-white text-xs font-bold uppercase tracking-widest">Escaneando...</span>
                  </motion.div>
                )}
                {status === 'success' && (
                  <motion.div 
                    key="success"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="bg-[#3CAC3B] px-6 py-2 rounded-full flex items-center gap-2 shadow-lg"
                  >
                    <CheckCircle2 className="h-5 w-5 text-white" />
                    <span className="text-white font-black uppercase italic tracking-tighter">
                      {detectedId}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div className="p-6 bg-[#1A1A1A] shrink-0">
          <h3 className="text-white font-bold mb-2">Instrucciones:</h3>
          <ul className="text-white/60 text-sm space-y-2">
            <li className="flex items-start gap-2">
              <span className="bg-[#2A398D] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
              Apunta al número de la figurita (ej. ARG 1).
            </li>
            <li className="flex items-start gap-2">
              <span className="bg-[#2A398D] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
              Mantén el celular quieto y asegúrate de tener buena luz.
            </li>
          </ul>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </motion.div>
    </div>
  );
}
