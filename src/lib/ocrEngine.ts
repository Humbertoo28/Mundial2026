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
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng', 1, {
        langPath: 'https://tessdata.projectnaptha.com/4.0.0_fast',
        logger: m => {
          // silent in background
        },
      });
      await worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ',
      });
      workerInstance = worker;
      isReady = true;
      isLoading = false;
      console.log('[OCR] Engine ready');
      return true;
    } catch (err) {
      console.error('[OCR] Failed to preload:', err);
      isLoading = false;
      loadPromise = null; // allow retry
      return false;
    }
  })();

  return loadPromise;
}
