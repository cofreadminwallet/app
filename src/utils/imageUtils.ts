/**
 * Image processing utilities for avatar uploads and persistent client-side storage.
 * Automatically resizes and compresses images into compact square avatars (max ~15-20KB),
 * preventing LocalStorage QuotaExceededError and Firestore 1MB document size limits.
 */

export async function compressAndCropAvatar(
  file: File,
  targetSize: number = 160,
  quality: number = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Basic type validation
    if (!file.type.startsWith('image/')) {
      reject(new Error('Por favor selecione um arquivo de imagem válido.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo de imagem.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Falha ao carregar os dados da imagem.'));
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = targetSize;
          canvas.height = targetSize;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Não foi possível obter contexto do Canvas 2D.'));
            return;
          }

          // Smooth rendering
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Calculate center square crop
          const srcWidth = img.naturalWidth || img.width;
          const srcHeight = img.naturalHeight || img.height;
          const minDim = Math.min(srcWidth, srcHeight);
          const startX = (srcWidth - minDim) / 2;
          const startY = (srcHeight - minDim) / 2;

          // Draw cropped centered square onto target canvas
          ctx.drawImage(
            img,
            startX,
            startY,
            minDim,
            minDim,
            0,
            0,
            targetSize,
            targetSize
          );

          // Output compressed JPEG
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}
