/**
 * Server-side open-source Piper TTS API (optional fallback).
 */

import { apiClient } from '@/services/api';

export interface TtsStatus {
  available: boolean;
  engine: string;
  voice: string | null;
  message?: string;
}

export async function fetchTtsStatus(): Promise<TtsStatus> {
  try {
    const { data } = await apiClient.get<TtsStatus>('/tts/status');
    return data;
  } catch {
    return { available: false, engine: 'piper', voice: null };
  }
}

export async function synthesizeServerSpeech(text: string): Promise<Blob | null> {
  try {
    const { data } = await apiClient.post<Blob>(
      '/tts/speak',
      { text },
      { responseType: 'blob', timeout: 120_000 }
    );
    if (data instanceof Blob && data.size > 0) return data;
    return null;
  } catch (err) {
    console.warn('[tts] server synthesis failed', err);
    return null;
  }
}
