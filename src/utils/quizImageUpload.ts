/** Client-side helpers for AI Quiz page image uploads (max 2 pages). */

export const QUIZ_PAGE_IMAGE_MAX = 2;
/** Max size of the original file the user picks or captures. */
export const QUIZ_PAGE_SOURCE_MAX_BYTES = 10 * 1024 * 1024;
/** Target max size after client-side compression (base64 payload). */
export const QUIZ_PAGE_MAX_BYTES = 4 * 1024 * 1024;
export const QUIZ_PAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

export interface QuizPageImage {
  id: string;
  name: string;
  previewUrl: string;
  /** Raw base64 without data-URI prefix */
  base64: string;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Invalid image file'));
    img.src = src;
  });
}

function stripDataUriPrefix(dataUrl: string): string {
  const i = dataUrl.indexOf(',');
  return i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
}

function base64PayloadBytes(dataUrl: string): number {
  return stripDataUriPrefix(dataUrl).length;
}

function renderJpegDataUrl(img: HTMLImageElement, maxWidth: number, quality: number): string {
  const scale = img.width > maxWidth ? maxWidth / img.width : 1;
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process image');
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', quality);
}

/** Resize/compress until the base64 payload is under QUIZ_PAGE_MAX_BYTES. */
async function compressImageFile(file: File): Promise<string> {
  const dataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(dataUrl);
  const maxMb = Math.round(QUIZ_PAGE_MAX_BYTES / (1024 * 1024));

  let maxWidth = Math.min(img.width, 2000);
  let quality = 0.85;
  const minWidth = 640;
  const minQuality = 0.35;

  while (true) {
    const compressed = renderJpegDataUrl(img, maxWidth, quality);
    if (base64PayloadBytes(compressed) <= QUIZ_PAGE_MAX_BYTES) {
      return compressed;
    }
    if (quality > minQuality) {
      quality = Math.max(minQuality, quality - 0.12);
      continue;
    }
    if (maxWidth > minWidth) {
      maxWidth = Math.max(minWidth, Math.round(maxWidth * 0.75));
      quality = 0.85;
      continue;
    }
    throw new Error(
      `${file.name} could not be compressed below ${maxMb}MB. Try a smaller or simpler photo.`
    );
  }
}

export { stripDataUriPrefix };

export async function fileToQuizPageImage(file: File): Promise<QuizPageImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error(`${file.name} is not an image`);
  }
  if (file.size > QUIZ_PAGE_SOURCE_MAX_BYTES) {
    throw new Error(
      `${file.name} is too large (max ${Math.round(QUIZ_PAGE_SOURCE_MAX_BYTES / (1024 * 1024))}MB)`
    );
  }
  const dataUrl = await compressImageFile(file);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: file.name,
    previewUrl: dataUrl,
    base64: stripDataUriPrefix(dataUrl),
  };
}

export async function filesToQuizPageImages(
  files: FileList | File[],
  existingCount: number
): Promise<QuizPageImage[]> {
  const list = Array.from(files);
  const room = QUIZ_PAGE_IMAGE_MAX - existingCount;
  if (room <= 0) {
    throw new Error(`You can upload up to ${QUIZ_PAGE_IMAGE_MAX} pages`);
  }
  if (list.length > room) {
    throw new Error(`Only ${room} more page${room === 1 ? '' : 's'} allowed (max ${QUIZ_PAGE_IMAGE_MAX})`);
  }
  return Promise.all(list.map(fileToQuizPageImage));
}
