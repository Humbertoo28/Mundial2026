// Singleton OCR Engine - Pre-loads Tesseract in the background
// so the scanner opens INSTANTLY when the user clicks the camera button.

let workerInstance: any = null;
let isLoading = false;
let isReady = false;
let loadPromise: Promise<boolean> | null = null;

export function getOcrStatus() {
  return { isLoading, isReady };
}

export function getWorker() {
  return workerInstance;
}

/** Pre-warm: call this when album page loads. Runs silently in background. */
export function preloadOcrEngine(): Promise<boolean> {
  if (isReady && workerInstance) return Promise.resolve(true);
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    isLoading = true;
    let retries = 2;
    
    while (retries > 0) {
      try {
        const { createWorker } = await import('tesseract.js');
        
        // Configuramos el worker usando los valores por defecto de la librería 
        // pero manteniendo el modelo de datos rápido (fast).
        const worker = await createWorker('eng', 1, {
          langPath: 'https://tessdata.projectnaptha.com/4.0.0_fast',
          // No forzamos paths de CDN externos para evitar bloqueos de CORS/Red
          logger: m => console.log('[OCR]', m.status)
        });

        await worker.setParameters({
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ',
          tessedit_pageseg_mode: '1' as any,
        });

        workerInstance = worker;
        isReady = true;
        isLoading = false;
        console.log('[OCR] Engine ready');
        return true;
      } catch (err) {
        console.error(`[OCR] Load attempt failed (${retries} retries left):`, err);
        retries--;
        if (retries === 0) {
          isLoading = false;
          loadPromise = null;
          return false;
        }
        // Wait a bit before retry
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    return false;
  })();

  return loadPromise;
}
