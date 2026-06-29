/**
 * Open-source Piper neural TTS in the browser (ONNX / WASM).
 * Voice: en_US-lessac-medium — soft-spoken US English female.
 */

import { download, predict } from '@the-vedantic-coder/piper-tts-web';
import {
  isAudioAborted,
  playAudioBlob,
  resetAudioAbort,
  stopAudioPlayback,
} from '@/utils/audioPlayback';
import { PIPER_VOICE_ID, VOICE_PLAYBACK_RATE } from '@/utils/voiceConfig';

export { PIPER_VOICE_ID };

let modelReady = false;
let modelLoading: Promise<boolean> | null = null;

export function isPiperBrowserSupported(): boolean {
  return typeof window !== 'undefined' && typeof Worker !== 'undefined';
}

export async function preloadPiperVoice(
  onProgress?: (percent: number) => void
): Promise<boolean> {
  if (modelReady) return true;
  if (!isPiperBrowserSupported()) return false;

  if (!modelLoading) {
    modelLoading = download(PIPER_VOICE_ID, (progress) => {
      if (progress.total > 0 && onProgress) {
        onProgress(Math.round((progress.loaded * 100) / progress.total));
      }
    })
      .then(() => {
        modelReady = true;
        return true;
      })
      .catch((err) => {
        console.warn('[piper] model download failed', err);
        modelLoading = null;
        return false;
      });
  }

  return modelLoading;
}

export function stopPiperSpeech(): void {
  stopAudioPlayback();
}

export interface PiperSpeakOptions {
  rate?: number;
  onStart?: () => void;
  onEnd?: () => void;
}

export async function speakWithPiper(
  chunks: string[],
  options: PiperSpeakOptions = {}
): Promise<{ ok: boolean; voiceUsed: string | null }> {
  if (!chunks.length) return { ok: false, voiceUsed: null };

  const ready = await preloadPiperVoice();
  if (!ready) return { ok: false, voiceUsed: null };

  resetAudioAbort();
  let started = false;

  for (const chunk of chunks) {
    if (!chunk.trim() || isAudioAborted()) break;

    try {
      const wav = await predict({ text: chunk, voiceId: PIPER_VOICE_ID });
      if (isAudioAborted()) break;

      if (!started) {
        started = true;
        options.onStart?.();
      }

      const played = await playAudioBlob(wav, {
        playbackRate: options.rate ?? VOICE_PLAYBACK_RATE,
      });
      if (!played) break;
    } catch (err) {
      console.warn('[piper] synthesis failed', err);
      return { ok: started, voiceUsed: started ? PIPER_VOICE_ID : null };
    }
  }

  options.onEnd?.();
  return { ok: started, voiceUsed: started ? PIPER_VOICE_ID : null };
}
