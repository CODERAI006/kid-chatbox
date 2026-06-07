/**
 * Browser speech-to-text with locale fallback and auto-restart.
 */

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';

export interface UseSpeechRecognitionOptions {
  lang?: string;
  fallbackLang?: string;
  continuous?: boolean;
  keepListeningRef?: MutableRefObject<boolean>;
  onInterimTranscript?: (text: string) => void;
  onFinalTranscript?: (text: string) => void;
}

export interface UseSpeechRecognitionResult {
  supported: boolean;
  listening: boolean;
  interimTranscript: string;
  finalTranscript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

function getRecognitionCtor(): (new () => SpeechRecognition) | null {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionResult {
  const {
    lang = 'en-IN',
    fallbackLang = 'en-US',
    continuous = true,
    keepListeningRef,
    onInterimTranscript,
    onFinalTranscript,
  } = options;

  const onInterimRef = useRef(onInterimTranscript);
  const onFinalRef = useRef(onFinalTranscript);
  onInterimRef.current = onInterimTranscript;
  onFinalRef.current = onFinalTranscript;

  const internalKeepRef = useRef(false);
  const keepRef = keepListeningRef ?? internalKeepRef;

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const activeLangRef = useRef(lang);
  const [supported] = useState(() => getRecognitionCtor() !== null);
  const [listening, setListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const restartIfNeeded = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition || !keepRef.current) return;
    window.setTimeout(() => {
      if (!keepRef.current || !recognitionRef.current) return;
      try {
        recognitionRef.current.start();
        setListening(true);
      } catch {
        /* already running */
      }
    }, 120);
  }, []);

  useEffect(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;

    const recognition = new Ctor();
    activeLangRef.current = lang;
    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const chunk = event.results[i][0]?.transcript ?? '';
        if (event.results[i].isFinal) final += chunk;
        else interim += chunk;
      }
      if (interim) {
        const trimmed = interim.trim();
        setInterimTranscript(trimmed);
        onInterimRef.current?.(trimmed);
      }
      if (final) {
        const trimmed = final.trim();
        setFinalTranscript(trimmed);
        setInterimTranscript('');
        onInterimRef.current?.('');
        onFinalRef.current?.(trimmed);
      }
    };

    recognition.onerror = (ev: SpeechRecognitionErrorEvent) => {
      if (ev.error === 'aborted') return;

      if (ev.error === 'no-speech') {
        setError('No speech detected. Try speaking again.');
        restartIfNeeded();
        return;
      }

      if (ev.error === 'language-not-supported' && activeLangRef.current !== fallbackLang) {
        activeLangRef.current = fallbackLang;
        recognition.lang = fallbackLang;
        restartIfNeeded();
        return;
      }

      if (ev.error === 'not-allowed') {
        setError('Microphone access denied. Allow mic in browser settings.');
      } else {
        setError(`Voice input error: ${ev.error}`);
      }
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      restartIfNeeded();
    };

    recognitionRef.current = recognition;
    return () => {
      keepRef.current = false;
      recognition.abort();
      recognitionRef.current = null;
    };
  }, [lang, fallbackLang, continuous, restartIfNeeded]);

  const startListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    setError(null);
    try {
      recognition.start();
      setListening(true);
    } catch {
      try {
        recognition.stop();
      } catch {
        /* ignore */
      }
      window.setTimeout(() => {
        try {
          recognitionRef.current?.start();
          setListening(true);
        } catch {
          setError('Could not start microphone. Tap the mic button again.');
        }
      }, 150);
    }
  }, []);

  const stopListening = useCallback(() => {
    keepRef.current = false;
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setInterimTranscript('');
    setFinalTranscript('');
    setError(null);
  }, []);

  return {
    supported,
    listening,
    interimTranscript,
    finalTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}
