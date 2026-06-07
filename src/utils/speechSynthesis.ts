/**
 * Text-to-speech — Piper (open-source neural) → server Piper → browser fallback.
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
const START_TIMEOUT_MS = 6000;
const HANG_MS_PER_CHAR = 120;
const HANG_MIN_MS = 45000;

let cachedVoice: SpeechSynthesisVoice | null | undefined;
let voicesReadyPromise: Promise<SpeechSynthesisVoice[]> | null = null;

export function isTtsSupported(): boolean {
  return isPiperBrowserSupported() || isBrowserTtsSupported();
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
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

interface UtteranceConfig {
  voice: SpeechSynthesisVoice | null;
  lang: string;
  rate: number;
  pitch: number;
  label: string;
}

function buildStrategies(voices: SpeechSynthesisVoice[], rate: number, pitch: number): UtteranceConfig[] {
  const indian = getIndianFemaleVoice(voices);
  const indianValid = indian && voices.some((v) => v.name === indian.name);

  const strategies: UtteranceConfig[] = [
    {
      voice: null,
      lang: 'en-US',
      rate,
      pitch,
      label: 'system default',
    },
  ];

  if (indianValid && indian) {
    strategies.unshift({
      voice: indian,
      lang: indian.lang,
      rate,
      pitch,
      label: indian.name,
    });
  }

  strategies.push({
    voice: null,
    lang: 'en-IN',
    rate,
    pitch,
    label: 'en-IN default',
  });

  return strategies;
}

function speakChunk(
  text: string,
  config: UtteranceConfig,
  fireStart: boolean,
  onStart?: () => void
): Promise<boolean> {
  return new Promise((resolve) => {
    if (!text.trim()) {
      resolve(true);
      return;
    }

    let settled = false;
    let started = false;

    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(startTimer);
      window.clearTimeout(hangTimer);
      resolve(ok);
    };

    const utterance = new SpeechSynthesisUtterance(text);
    if (config.voice) {
      utterance.voice = config.voice;
      utterance.lang = config.voice.lang;
    } else {
      utterance.lang = config.lang;
    }
    utterance.rate = config.rate;
    utterance.pitch = config.pitch;
    utterance.volume = 1;

    // Prevent GC on some browsers.
    (window as Window & { __kidChatUtterance?: SpeechSynthesisUtterance }).__kidChatUtterance =
      utterance;

    utterance.onstart = () => {
      started = true;
      if (fireStart) {
        unlockSpeechSynthesis();
        onStart?.();
      }
    };
    utterance.onend = () => finish(true);
    utterance.onerror = () => finish(false);

    const startTimer = window.setTimeout(() => {
      if (started || settled) return;
      if (speechSynthesis.speaking || speechSynthesis.pending) return;
      finish(false);
    }, START_TIMEOUT_MS);

    // Safety net only — never resolve success here; wait for onend.
    const hangTimer = window.setTimeout(() => {
      if (settled) return;
      speechSynthesis.cancel();
      finish(false);
    }, Math.max(HANG_MIN_MS, text.length * HANG_MS_PER_CHAR + 15000));

    unlockSpeechSynthesis();
    speechSynthesis.speak(utterance);
    unlockSpeechSynthesis();
  });
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

  const serverResult = await speakWithServerPiper(chunks, options);
  if (serverResult.ok) return serverResult;

  return speakWithBrowser(cleaned, options);
}

async function speakWithBrowser(
  cleaned: string,
  options: SpeakOptions
): Promise<SpeakResult> {
  if (!isBrowserTtsSupported()) return { ok: false, voiceUsed: null };

  unlockSpeechSynthesis();
  speechSynthesis.cancel();
  await delay(200);

  const voices = await loadVoices();
  const rate = options.rate ?? 0.95;
  const pitch = options.pitch ?? 1.05;
  const strategies = buildStrategies(voices, rate, pitch);
  const chunks = splitForSpeech(cleaned);

  let anySuccess = false;
  let voiceUsed: string | null = null;
  let winningStrategy: UtteranceConfig | null = null;

  for (let i = 0; i < chunks.length; i += 1) {
    if (i > 0) await delay(120);

    const tryStrategies: UtteranceConfig[] = winningStrategy ? [winningStrategy] : strategies;
    let chunkOk = false;

    for (let s = 0; s < tryStrategies.length; s += 1) {
      const strategy: UtteranceConfig = tryStrategies[s];
      if (s > 0) {
        speechSynthesis.cancel();
        await delay(100);
      }

      chunkOk = await speakChunk(
        chunks[i],
        strategy,
        i === 0 && !anySuccess,
        options.onStart
      );
      if (chunkOk) {
        anySuccess = true;
        winningStrategy = strategy;
        voiceUsed = strategy.label;
        break;
      }
    }

    if (!chunkOk) break;
  }

  options.onEnd?.();
  return { ok: anySuccess, voiceUsed };
}

export function stopSpeaking(): void {
  stopPiperSpeech();
  stopServerPiperSpeech();
  stopAudioPlayback();
  if (isBrowserTtsSupported()) speechSynthesis.cancel();
}
