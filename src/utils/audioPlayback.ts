/** Play WAV/MP3 blobs sequentially with abort support. */

let activeAudio: HTMLAudioElement | null = null;
let activeUrl: string | null = null;
let abortPlayback = false;

export function stopAudioPlayback(): void {
  abortPlayback = true;
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.src = '';
    activeAudio = null;
  }
  if (activeUrl) {
    URL.revokeObjectURL(activeUrl);
    activeUrl = null;
  }
}

export function resetAudioAbort(): void {
  abortPlayback = false;
}

export function isAudioAborted(): boolean {
  return abortPlayback;
}

export interface PlayAudioOptions {
  playbackRate?: number;
}

export function playAudioBlob(blob: Blob, options: PlayAudioOptions = {}): Promise<boolean> {
  return new Promise((resolve) => {
    if (abortPlayback) {
      resolve(false);
      return;
    }

    if (activeUrl) URL.revokeObjectURL(activeUrl);
    activeUrl = URL.createObjectURL(blob);
    activeAudio = new Audio(activeUrl);
    if (options.playbackRate && options.playbackRate > 0) {
      activeAudio.playbackRate = options.playbackRate;
    }

    const done = (ok: boolean) => {
      if (activeUrl) {
        URL.revokeObjectURL(activeUrl);
        activeUrl = null;
      }
      activeAudio = null;
      resolve(ok && !abortPlayback);
    };

    activeAudio.onended = () => done(true);
    activeAudio.onerror = () => done(false);
    void activeAudio.play().catch(() => done(false));
  });
}
