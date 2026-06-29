/**
 * Server Piper TTS playback — rhasspy/piper on Express (open source).
 */

import { synthesizeServerSpeech } from '@/services/ttsApi';
import {
  isAudioAborted,
  playAudioBlob,
  resetAudioAbort,
  stopAudioPlayback,
} from '@/utils/audioPlayback';
import { VOICE_PLAYBACK_RATE } from '@/utils/voiceConfig';

export function stopServerPiperSpeech(): void {
  stopAudioPlayback();
}

export interface ServerPiperOptions {
  rate?: number;
  onStart?: () => void;
  onEnd?: () => void;
}

export async function speakWithServerPiper(
  chunks: string[],
  options: ServerPiperOptions = {}
): Promise<{ ok: boolean; voiceUsed: string | null }> {
  if (!chunks.length) return { ok: false, voiceUsed: null };

  resetAudioAbort();
  let started = false;
  let voiceUsed: string | null = null;

  for (const chunk of chunks) {
    if (!chunk.trim() || isAudioAborted()) break;

    const wav = await synthesizeServerSpeech(chunk);
    if (!wav || isAudioAborted()) break;

    if (!started) {
      started = true;
      voiceUsed = 'piper-server';
      options.onStart?.();
    }

    const played = await playAudioBlob(wav, {
      playbackRate: options.rate ?? VOICE_PLAYBACK_RATE,
    });
    if (!played) break;
  }

  options.onEnd?.();
  return { ok: started, voiceUsed };
}
