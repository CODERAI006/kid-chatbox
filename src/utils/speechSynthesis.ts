/**
 * Text-to-speech — Piper in browser, then server Piper (single female voice, no browser dual-voice fallback).
 */

import { resolveWorkspace } from '@/utils/learningWorkspaceParser';
import {
  isPiperBrowserSupported,
  preloadPiperVoice,
  speakWithPiper,
  stopPiperSpeech,
} from '@/utils/piperSpeech';
import { speakWithServerPiper, stopServerPiperSpeech } from '@/utils/serverPiperSpeech';
import { stopAudioPlayback } from '@/utils/audioPlayback';

const INDIAN_VOICE_HINTS = [
  'neerja',
  'heera',
  'raveena',
  'kavya',
  'swara',
  'lekha',
  'india',
  'en-in',
  'hi-in',
];

const FEMALE_HINTS = ['female', 'woman', 'neerja', 'heera', 'raveena', 'kavya', 'swara'];

const CHUNK_MAX = 320;

let cachedVoice: SpeechSynthesisVoice | null | undefined;
let voicesReadyPromise: Promise<SpeechSynthesisVoice[]> | null = null;

export function isTtsSupported(): boolean {
  return isPiperBrowserSupported();
}

export function isBrowserTtsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function isIndianVoice(voice: SpeechSynthesisVoice): boolean {
  const name = voice.name.toLowerCase();
  const lang = voice.lang.toLowerCase();
  return INDIAN_VOICE_HINTS.some((h) => name.includes(h) || lang.includes(h));
}

function isFemaleVoice(voice: SpeechSynthesisVoice): boolean {
  return FEMALE_HINTS.some((h) => voice.name.toLowerCase().includes(h));
}

export function pickIndianFemaleVoice(
  voices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | null {
  if (!voices.length) return null;

  const indian = voices.filter(isIndianVoice);
  const indianFemale = indian.filter(isFemaleVoice);
  if (indianFemale.length > 0) return indianFemale[0];

  const enIn = voices.find((v) => v.lang.toLowerCase().startsWith('en-in'));
  if (enIn) return enIn;

  if (indian.length > 0) return indian[0];

  const englishFemale = voices.filter(
    (v) => v.lang.startsWith('en') && isFemaleVoice(v)
  );
  return (
    englishFemale[0] ??
    voices.find((v) => v.lang.toLowerCase().startsWith('en-us')) ??
    voices.find((v) => v.lang.startsWith('en')) ??
    null
  );
}

export function loadVoices(timeoutMs = 3000): Promise<SpeechSynthesisVoice[]> {
  if (!isBrowserTtsSupported()) return Promise.resolve([]);

  const existing = speechSynthesis.getVoices();
  if (existing.length > 0) return Promise.resolve(existing);

  if (voicesReadyPromise) return voicesReadyPromise;

  voicesReadyPromise = new Promise((resolve) => {
    const finish = () => {
      speechSynthesis.removeEventListener('voiceschanged', onChange);
      resolve(speechSynthesis.getVoices());
      voicesReadyPromise = null;
    };

    const onChange = () => {
      if (speechSynthesis.getVoices().length > 0) finish();
    };

    speechSynthesis.addEventListener('voiceschanged', onChange);
    speechSynthesis.getVoices();
    window.setTimeout(finish, timeoutMs);
  });

  return voicesReadyPromise;
}

export function getIndianFemaleVoice(
  voices = speechSynthesis.getVoices()
): SpeechSynthesisVoice | null {
  if (!isBrowserTtsSupported()) return null;

  const picked = pickIndianFemaleVoice(voices);
  if (picked) {
    cachedVoice = picked;
    return picked;
  }

  if (cachedVoice !== undefined) return cachedVoice;
  cachedVoice = null;
  return null;
}

export function preloadVoices(): void {
  if (isBrowserTtsSupported()) {
    void loadVoices();
    speechSynthesis.onvoiceschanged = () => {
      cachedVoice = undefined;
      getIndianFemaleVoice();
    };
  }
  void preloadPiperVoice();
}

export function unlockSpeechSynthesis(): void {
  if (!isBrowserTtsSupported()) return;
  try {
    if (speechSynthesis.paused) speechSynthesis.resume();
  } catch {
    /* ignore */
  }
}

/** Prime TTS engine on user gesture (Voice chat tap). */
export function warmUpSpeechSynthesis(): void {
  if (!isBrowserTtsSupported()) return;
  unlockSpeechSynthesis();
  try {
    const warm = new SpeechSynthesisUtterance(' ');
    warm.volume = 0.01;
    warm.rate = 10;
    speechSynthesis.speak(warm);
    window.setTimeout(() => speechSynthesis.cancel(), 50);
  } catch {
    /* ignore */
  }
}

export function textForSpeech(raw: string): string {
  return raw
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitLongSegment(segment: string, maxLen: number): string[] {
  if (segment.length <= maxLen) return [segment];

  const commaParts = segment.split(/,\s+/);
  const out: string[] = [];
  let buf = '';

  for (const part of commaParts) {
    const piece = buf ? `${buf}, ${part}` : part;
    if (piece.length > maxLen && buf) {
      out.push(buf.trim());
      buf = part;
    } else if (piece.length > maxLen) {
      for (let i = 0; i < part.length; i += maxLen) {
        out.push(part.slice(i, i + maxLen).trim());
      }
      buf = '';
    } else {
      buf = piece;
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

export function splitForSpeech(text: string, maxLen = CHUNK_MAX): string[] {
  if (text.length <= maxLen) return [text];

  const parts = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [text];
  const chunks: string[] = [];
  let buf = '';

  for (const part of parts) {
    const next = `${buf}${part}`.trim();
    if (next.length > maxLen && buf.trim()) {
      chunks.push(buf.trim());
      buf = part;
    } else {
      buf = next;
    }
  }
  if (buf.trim()) {
    if (buf.length > maxLen) chunks.push(...splitLongSegment(buf.trim(), maxLen));
    else chunks.push(buf.trim());
  }

  return chunks.length > 0 ? chunks : splitLongSegment(text, maxLen);
}

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onEnd?: () => void;
}

export interface SpeakResult {
  ok: boolean;
  voiceUsed: string | null;
}

export function extractSpeakableReply(content: string): string {
  const ws = resolveWorkspace(content);
  const parts: string[] = [];

  if (ws.topic && ws.topic !== 'Learning') {
    parts.push(`Let me explain ${ws.topic}.`);
  }

  for (const card of ws.cards ?? []) {
    if (card.audioText) {
      parts.push(card.audioText);
      break;
    }
    if (card.body) parts.push(card.body);
    if (parts.join(' ').length > 500) break;
  }

  const joined = parts.join(' ').trim();
  return joined ? textForSpeech(joined).slice(0, 900) : textForSpeech(content);
}

export async function speakText(
  text: string,
  options: SpeakOptions = {}
): Promise<SpeakResult> {
  const cleaned = textForSpeech(text);
  if (!cleaned) return { ok: false, voiceUsed: null };

  const chunks = splitForSpeech(cleaned);

  const piperResult = await speakWithPiper(chunks, options);
  if (piperResult.ok) return piperResult;

  return speakWithServerPiper(chunks, options);
}

export function stopSpeaking(): void {
  stopPiperSpeech();
  stopServerPiperSpeech();
  stopAudioPlayback();
  if (isBrowserTtsSupported()) speechSynthesis.cancel();
}
