/**
 * Voice conversation loop: listen → send → speak → listen again.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSpeechRecognition } from './useSpeechRecognition';
import {
  isTtsSupported,
  preloadVoices,
  speakText,
  stopSpeaking,
  unlockSpeechSynthesis,
  warmUpSpeechSynthesis,
} from '@/utils/speechSynthesis';
import { preloadPiperVoice } from '@/utils/piperSpeech';
import { BROWSER_TTS_RATE, GURU_VOICE_LABEL } from '@/utils/voiceConfig';

export type VoicePhase = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface VoiceSendOptions {
  mode?: 'workspace' | 'chat';
}

export interface UseVoiceConversationOptions {
  enabled: boolean;
  pending: boolean;
  onSendMessage: (text: string, opts?: VoiceSendOptions) => Promise<boolean>;
  onTranscriptChange?: (text: string) => void;
  lastAssistantText: string | null;
  assistantMessageCount: number;
}

export interface UseVoiceConversationResult {
  voiceMode: boolean;
  voiceSupported: boolean;
  ttsSupported: boolean;
  phase: VoicePhase;
  interimTranscript: string;
  voiceError: string | null;
  voiceLabel: string;
  toggleVoiceMode: () => void;
  enableVoiceMode: () => void;
  startMic: () => void;
  stopMic: () => void;
  stopSpeakingNow: () => void;
  stopAll: () => void;
}

export function useVoiceConversation(
  options: UseVoiceConversationOptions
): UseVoiceConversationResult {
  const {
    enabled,
    pending,
    onSendMessage,
    onTranscriptChange,
    lastAssistantText,
    assistantMessageCount,
  } = options;

  const onSendRef = useRef(onSendMessage);
  const onTranscriptRef = useRef(onTranscriptChange);
  onSendRef.current = onSendMessage;
  onTranscriptRef.current = onTranscriptChange;

  const [voiceMode, setVoiceMode] = useState(false);
  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [ttsError, setTtsError] = useState<string | null>(null);
  const lastSpokenCountRef = useRef(0);
  const speakingRef = useRef(false);
  const voiceModeRef = useRef(false);
  const keepListeningRef = useRef(false);
  const wasPendingRef = useRef(false);
  const pendingRef = useRef(pending);
  pendingRef.current = pending;

  const ttsSupported = isTtsSupported();
  const startListeningRef = useRef<(() => void) | null>(null);

  const resumeListening = useCallback(() => {
    speakingRef.current = false;
    if (voiceModeRef.current) {
      setPhase('listening');
      resetTranscriptRef.current?.();
      keepListeningRef.current = true;
      startListeningRef.current?.();
    } else {
      setPhase('idle');
    }
  }, []);

  const resetTranscriptRef = useRef<(() => void) | null>(null);

  const handleFinalTranscript = useCallback(async (text: string) => {
    if (!text.trim() || !voiceModeRef.current) return;

    onTranscriptRef.current?.(text);
    setPhase('thinking');
    setTtsError(null);
    stopSpeaking();

    const sent = await onSendRef.current(text, { mode: 'chat' });
    if (!sent) {
      setPhase('listening');
      keepListeningRef.current = voiceModeRef.current;
      startListeningRef.current?.();
    }
  }, []);

  const {
    supported: sttSupported,
    listening,
    interimTranscript,
    error: sttError,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({
    lang: 'en-IN',
    fallbackLang: 'en-US',
    continuous: true,
    keepListeningRef,
    onInterimTranscript: (text) => onTranscriptRef.current?.(text),
    onFinalTranscript: (text) => void handleFinalTranscript(text),
  });

  startListeningRef.current = startListening;
  resetTranscriptRef.current = resetTranscript;

  const voiceSupported = sttSupported;

  useEffect(() => {
    preloadVoices();
  }, []);

  useEffect(() => {
    keepListeningRef.current =
      voiceMode && !speakingRef.current && !pendingRef.current && phase !== 'thinking';
  }, [voiceMode, pending, phase]);

  useEffect(() => {
    if (listening && !speakingRef.current && phase !== 'thinking') {
      setPhase('listening');
    }
  }, [listening, phase]);

  useEffect(() => {
    if (pending) {
      setPhase('thinking');
      setTtsError(null);
    }
  }, [pending]);

  const speakReply = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      speakingRef.current = true;
      keepListeningRef.current = false;
      setPhase('speaking');
      setTtsError(null);
      stopListening();

      await new Promise((r) => window.setTimeout(r, 300));

      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        if (speakingRef.current) resumeListening();
      };

      if (ttsSupported) {
        unlockSpeechSynthesis();
        try {
          const result = await speakText(text, {
            rate: BROWSER_TTS_RATE,
            onStart: () => setTtsError(null),
          });
          if (!result.ok && speakingRef.current) {
            setTtsError('Voice unavailable — read the reply above or tap the speaker icon.');
          }
        } catch {
          if (speakingRef.current) {
            setTtsError('Voice playback failed — read the reply above.');
          }
        } finally {
          finish();
        }
      } else {
        finish();
      }
    },
    [resumeListening, stopListening, ttsSupported]
  );

  useEffect(() => {
    const justFinished = wasPendingRef.current && !pending;
    wasPendingRef.current = pending;

    if (!voiceMode || !justFinished || !lastAssistantText) return;
    if (assistantMessageCount <= lastSpokenCountRef.current) return;

    lastSpokenCountRef.current = assistantMessageCount;
    void speakReply(lastAssistantText);
  }, [pending, lastAssistantText, voiceMode, assistantMessageCount, speakReply]);

  const beginListening = useCallback(() => {
    resetTranscript();
    keepListeningRef.current = true;
    startListening();
    setPhase('listening');
  }, [resetTranscript, startListening]);

  const enableVoiceMode = useCallback(() => {
    if (!voiceSupported || voiceModeRef.current) return;
    voiceModeRef.current = true;
    setVoiceMode(true);
    unlockSpeechSynthesis();
    warmUpSpeechSynthesis();
    void preloadPiperVoice();
    lastSpokenCountRef.current = assistantMessageCount;
    beginListening();
  }, [voiceSupported, beginListening, assistantMessageCount]);

  const toggleVoiceMode = useCallback(() => {
    setVoiceMode((prev) => {
      const next = !prev;
      voiceModeRef.current = next;

      if (!next) {
        keepListeningRef.current = false;
        stopSpeaking();
        stopListening();
        resetTranscript();
        onTranscriptRef.current?.('');
        setPhase('idle');
        setTtsError(null);
        lastSpokenCountRef.current = assistantMessageCount;
      } else if (voiceSupported) {
        unlockSpeechSynthesis();
        warmUpSpeechSynthesis();
        void preloadPiperVoice();
        lastSpokenCountRef.current = assistantMessageCount;
        beginListening();
      }
      return next;
    });
  }, [voiceSupported, beginListening, resetTranscript, stopListening, assistantMessageCount]);

  const startMic = useCallback(() => {
    if (!voiceSupported) return;
    stopSpeaking();
    speakingRef.current = false;
    setTtsError(null);
    beginListening();
  }, [voiceSupported, beginListening]);

  const stopMic = useCallback(() => {
    keepListeningRef.current = false;
    stopListening();
    if (!speakingRef.current) setPhase('idle');
  }, [stopListening]);

  const stopSpeakingNow = useCallback(() => {
    stopSpeaking();
    speakingRef.current = false;
    setTtsError(null);
    if (voiceModeRef.current) {
      keepListeningRef.current = true;
      setPhase('listening');
      startListening();
    } else {
      setPhase('idle');
    }
  }, [startListening]);

  const stopAll = useCallback(() => {
    keepListeningRef.current = false;
    voiceModeRef.current = false;
    stopSpeaking();
    stopListening();
    speakingRef.current = false;
    setPhase('idle');
    setTtsError(null);
  }, [stopListening]);

  useEffect(() => {
    if (!enabled && voiceMode) {
      stopAll();
      setVoiceMode(false);
    }
  }, [enabled, voiceMode, stopAll]);

  const voiceLabel =
    phase === 'listening'
      ? 'Listening… speak your question'
      : phase === 'thinking'
        ? 'Thinking…'
        : phase === 'speaking'
          ? ttsError ?? `${GURU_VOICE_LABEL} — tap speaker to skip`
          : voiceMode
            ? 'Tap mic to ask'
            : 'Tap mic for voice conversation';

  return {
    voiceMode,
    voiceSupported,
    ttsSupported,
    phase,
    interimTranscript,
    voiceError: sttError ?? ttsError,
    voiceLabel,
    toggleVoiceMode,
    enableVoiceMode,
    startMic,
    stopMic,
    stopSpeakingNow,
    stopAll,
  };
}
