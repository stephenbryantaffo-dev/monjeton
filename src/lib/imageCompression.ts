/**
 * Compression d'image pour les reçus — Mon Jeton
 *
 * Objectif : alléger ce qui est STOCKÉ, sans toucher à ce qui est
 * envoyé à l'IA pour l'OCR (celui-ci reçoit toujours la meilleure image).
 *
 * Produit deux sorties à partir d'une photo :
 *   - archive  : 1600 px max, qualité 0.8  (~250 Ko) — pour relire un reçu
 *   - thumb    :  256 px max, qualité 0.6  (~15 Ko)  — pour la liste
 *
 * Tout se passe côté navigateur (canvas), aucune dépendance.
 */

export type CompressedImage = {
  /** Fichier compressé destiné au stockage "plein écran". */
  archive: File;
  /** Vignette très légère, destinée à la liste des reçus. */
  thumb: File;
  /** Dimensions finales de l'archive, utiles pour le debug. */
  width: number;
  height: number;
};

async function toBlob(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob a renvoyé null'))),
      'image/jpeg',
      quality
    );
  });
}

function draw(bitmap: ImageBitmap, maxSide: number): HTMLCanvasElement {
  const ratio = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * ratio);
  canvas.height = Math.round(bitmap.height * ratio);
  const ctx = canvas.getContext('2d')!;
  // Fond blanc : un reçu scanné avec transparence ne devient pas noir
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/**
 * Compresse une photo de reçu en deux formats (archive + vignette).
 * L'original n'est jamais modifié ; il reste disponible pour l'OCR.
 */
export async function compressReceipt(file: File): Promise<CompressedImage> {
  const bitmap = await createImageBitmap(file);

  try {
    const archiveCanvas = draw(bitmap, 1600);
    const thumbCanvas = draw(bitmap, 256);

    const [archiveBlob, thumbBlob] = await Promise.all([
      toBlob(archiveCanvas, 0.8),
      toBlob(thumbCanvas, 0.6),
    ]);

    return {
      archive: new File([archiveBlob], 'receipt.jpg', { type: 'image/jpeg' }),
      thumb: new File([thumbBlob], 'receipt-thumb.jpg', { type: 'image/jpeg' }),
      width: archiveCanvas.width,
      height: archiveCanvas.height,
    };
  } finally {
    // Libère la mémoire du bitmap décodé
    bitmap.close?.();
  }
}

/**
 * Lit un fichier en base64 (sans le préfixe data:...) pour l'envoi à l'IA.
 * On passe TOUJOURS l'original ici, jamais la version compressée.
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
