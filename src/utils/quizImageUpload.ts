/** Client-side helpers for AI Quiz page image uploads (max 5 pages). */

export const QUIZ_PAGE_IMAGE_MAX = 5;
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

/** Resize/compress to keep payloads small for API upload. */
async function compressImageFile(file: File, maxWidth = 1400, quality = 0.82): Promise<string> {
  const dataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(dataUrl);
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

export function stripDataUriPrefix(dataUrl: string): string {
  const i = dataUrl.indexOf(',');
  return i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
}

export async function fileToQuizPageImage(file: File): Promise<QuizPageImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error(`${file.name} is not an image`);
  }
  if (file.size > QUIZ_PAGE_MAX_BYTES) {
    throw new Error(`${file.name} is too large (max ${Math.round(QUIZ_PAGE_MAX_BYTES / (1024 * 1024))}MB)`);
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
