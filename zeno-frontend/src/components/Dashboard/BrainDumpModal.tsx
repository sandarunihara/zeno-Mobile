import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Modal, View, Text, Pressable, ScrollView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Mic, Square, Brain, AlertCircle, Keyboard as KeyboardIcon } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from "expo-speech-recognition";
import { dashboardApi } from '../../api/dashboardApi';

interface BrainDumpModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSave?: (text: string) => void;
}

const BrainDumpModal: React.FC<BrainDumpModalProps> = ({ isVisible, onClose, onSave }) => {
  const { isDark } = useTheme();
  const [isRecording, setIsRecording] = useState(false);
  const [displayText, setDisplayText] = useState('');

  // Ref always mirrors the latest displayText so event handlers never have stale closures
  const displayTextRef = useRef('');
  
  // Accumulate completed speech segments from previous sessions
  const completedSegmentsRef = useRef<string[]>([]);
  // The current in-progress segment
  const currentSegmentRef = useRef('');

  const [error, setError] = useState<string | null>(null);
  const [useKeyboard, setUseKeyboard] = useState(false);
  const [debugLog, setDebugLog] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const wantsToRecord = useRef(false);
  const sessionCountRef = useRef(0);

  // Helper: sync the ref → state (call after every ref mutation)
  const flush = useCallback(() => {
    setDisplayText(displayTextRef.current);
  }, []);

  // ─── Stop helper ────────────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    wantsToRecord.current = false;
    try { ExpoSpeechRecognitionModule.stop(); } catch (_) {}
    setIsRecording(false);

    // Only commit leftover interim text (finals are already committed in 'result' handler)
    const leftover = currentSegmentRef.current.trim();
    if (leftover) {
      completedSegmentsRef.current.push(leftover);
    }
    currentSegmentRef.current = '';

    const completedText = completedSegmentsRef.current.filter(Boolean).join(' ');
    displayTextRef.current = completedText;
    flush();
  }, [flush]);

  // Cleanup when modal hides
  useEffect(() => {
    if (!isVisible) stopRecording();
  }, [isVisible, stopRecording]);

  // ─── Start helper ───────────────────────────────────────────────────────────
  const startRecognition = useCallback(() => {
    if (!wantsToRecord.current) return;
    sessionCountRef.current += 1;
    setDebugLog(`session #${sessionCountRef.current} — listening`);
    try {
      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,   // get partial results as user speaks
        continuous: false,
        requiresOnDeviceRecognition: false, // allow cloud fallback for better accuracy
        addsPunctuation: false,
        androidIntentOptions: {
          EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 15000,           // wait up to 15s for speech to start
          EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 2000,   // 2s silence = done speaking
          EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 2000,
        },
      });
    } catch (e: any) {
      console.error('[BD] start error:', e.message);
      setError('Could not start microphone: ' + e.message);
      wantsToRecord.current = false;
      setIsRecording(false);
    }
  }, []);

  // Single restart gate — prevents double-starts from concurrent event firings
  const restartScheduled = useRef(false);

  const scheduleRestart = useCallback((delayMs = 400) => {
    if (!wantsToRecord.current || restartScheduled.current) return;
    restartScheduled.current = true;
    setTimeout(() => {
      restartScheduled.current = false;
      if (wantsToRecord.current) startRecognition();
    }, delayMs);
  }, [startRecognition]);

  // ─── Native event hooks ──────────────────────────────────────────────────────

  useSpeechRecognitionEvent('start', () => {
    setDebugLog('started ✓ — speak now');
    setIsRecording(true);
  });

  useSpeechRecognitionEvent('audiostart', () => {
    setDebugLog('audio captured ✓ — speak now');
  });

  useSpeechRecognitionEvent('speechstart', () => {
    setDebugLog('speech detected ✓');
  });

  useSpeechRecognitionEvent('result', (event) => {
    const results = event.results ?? [];
    if (results.length === 0) return;

    // Take only the LAST result's transcript — it is the most complete/up-to-date.
    // Joining all results was causing duplication (e.g. "im tiredim tired") because
    // the array often contains overlapping interim + final versions of the same speech.
    const latestTranscript = results[results.length - 1]?.transcript ?? '';

    setDebugLog('result ✓ isFinal=' + event.isFinal + ' text="' + latestTranscript + '"');

    if (event.isFinal) {
      // Immediately commit the final transcript so it won't be lost when a new session starts
      const trimmed = latestTranscript.trim();
      if (trimmed) {
        completedSegmentsRef.current.push(trimmed);
      }
      currentSegmentRef.current = ''; // clear — it's been committed
    } else {
      // Interim result: keep it as the in-progress segment (will be shown but not committed yet)
      currentSegmentRef.current = latestTranscript;
    }

    // Build the full display text
    const completedText = completedSegmentsRef.current.filter(Boolean).join(' ');
    const currentTrimmed = currentSegmentRef.current.trim();
    const fullText = completedText && currentTrimmed
      ? (completedText + ' ' + currentTrimmed)
      : (completedText || currentTrimmed);

    displayTextRef.current = fullText;
    flush();
  });

  useSpeechRecognitionEvent('nomatch', () => {
    setDebugLog('no match');
    // Let 'end' handle restart
  });

  useSpeechRecognitionEvent('end', () => {
    setDebugLog(prev => prev + ' | ended');

    // Only commit leftover interim text that was never finalized.
    // Final results are already committed in the 'result' handler.
    const leftover = currentSegmentRef.current.trim();
    if (leftover) {
      completedSegmentsRef.current.push(leftover);
    }
    currentSegmentRef.current = '';

    const completedText = completedSegmentsRef.current.filter(Boolean).join(' ');
    displayTextRef.current = completedText;
    flush();

    // Single restart point for all normal session endings
    scheduleRestart(400);
    if (!wantsToRecord.current) setIsRecording(false);
  });

  useSpeechRecognitionEvent('error', (event) => {
    const code = event.error;
    console.warn('[BD] error:', code, event.message);
    setDebugLog('error: ' + code);

    if (code === 'aborted') {
      // User stopped — do nothing, end event will clean up
      return;
    }

    if (code === 'no-speech' || code === 'speech-timeout' || code === 'network') {
      // Normal session timeout — let 'end' event handle the restart
      // (end always fires after error, so scheduleRestart will be called there)
      return;
    }

    // Real fatal errors
    setError(`Voice error (${code}). Try the keyboard instead.`);
    wantsToRecord.current = false;
    setIsRecording(false);
  });

  // ─── Toggle ──────────────────────────────────────────────────────────────────
  const handleToggleRecording = useCallback(async () => {
    if (isRecording) {
      stopRecording();
    } else {
      setError(null);
      setDebugLog('checking permission...');
      setUseKeyboard(false);
      try {
        // First check existing permission status (doesn't require Activity attachment)
        let perm = await ExpoSpeechRecognitionModule.getPermissionsAsync();

        if (!perm.granted) {
          // Try to request — this may fail inside an Android Modal
          try {
            perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
          } catch (reqErr: any) {
            // Android Modal "not attached to Activity" — direct user to Settings
            console.warn('[BD] requestPermissions failed (likely Modal):', reqErr.message);
            setError('Please grant microphone permission in Settings → Apps → Zeno → Permissions, then try again.');
            return;
          }
        }

        if (!perm.granted) {
          setError('Microphone permission denied. Go to Settings → Apps → Zeno → Permissions.');
          return;
        }
        wantsToRecord.current = true;
        setIsRecording(true);
        startRecognition();
      } catch (e: any) {
        console.error('[BD] permission error:', e.message);
        setError(e.message || 'Failed to start recording');
      }
    }
  }, [isRecording, stopRecording, startRecognition]);

  const handleClose = useCallback(() => {
    stopRecording();
    onClose();
  }, [stopRecording, onClose]);

  const handleSave = useCallback(async () => {
    const text = displayText.trim();
    if (!text) return;

    setIsSaving(true);
    setError(null);
    try {
      const response = await dashboardApi.createTaskFromTranscript(text);
      if (response.success) {
        if (onSave) {
          onSave(text);
        }
        handleClose();
      } else {
        setError(response.message || 'Failed to save thought to tasks.');
      }
    } catch (err: any) {
      console.error('[BrainDumpModal] save error:', err);
      setError(err.message || 'An error occurred while saving your thought.');
    } finally {
      setIsSaving(false);
    }
  }, [displayText, onSave, handleClose]);


  return (
    <Modal visible={isVisible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-end bg-black/40"
      >
        <Pressable className="flex-1" onPress={handleClose} />
        <View className="h-[90%] w-full rounded-t-[32px] bg-white dark:bg-black"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.15,
            shadowRadius: 20,
            elevation: 24,
          }}
        >
          {/* Grab Handle */}
          <View className="items-center pt-2.5 pb-2">
            <View className="h-1.5 w-10 rounded-full bg-zinc-300 dark:bg-zinc-600" />
          </View>

          {/* iOS Header */}
          <View className="flex-row items-center justify-between px-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
            <Pressable onPress={handleClose} hitSlop={10} className="w-16">
              <Text className="text-[17px] text-[#007AFF]">Cancel</Text>
            </Pressable>
            <View className="flex-row items-center justify-center flex-1 gap-1.5">
              <Brain size={16} color={isDark ? '#EBEBF5' : '#000000'} />
              <Text className="text-[17px] font-semibold text-black dark:text-white">Brain Dump</Text>
            </View>
            <Pressable 
              onPress={handleSave} 
              disabled={!displayText.trim() || isSaving} 
              hitSlop={10} 
              className="w-16 items-end"
            >
              {isSaving ? (
                <ActivityIndicator color="#007AFF" size="small" />
              ) : (
                <Text className={['text-[17px] font-semibold', displayText.trim() ? 'text-[#007AFF]' : 'text-zinc-300 dark:text-zinc-600'].join(' ')}>
                  Save
                </Text>
              )}
            </Pressable>
          </View>

          <View className="flex-1 px-4 pt-5">
            {/* Debug strip */}
            {debugLog !== '' && (
              <View className="mb-3 rounded-lg bg-white dark:bg-black px-3 py-2 border border-zinc-200 dark:border-zinc-800">
                <Text className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">{debugLog}</Text>
              </View>
            )}

            {/* Error */}
            {error && (
              <View className="mb-4 flex-row items-center gap-2 rounded-xl bg-red-50 p-3 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30">
                <AlertCircle size={16} color="#FF3B30" />
                <Text className="flex-1 text-[12px] font-medium text-red-600 dark:text-red-400">{error}</Text>
              </View>
            )}

            {/* Input Area (iOS Card) */}
            <View className="flex-1 rounded-3xl bg-white dark:bg-black p-4 mb-6 border border-zinc-200 dark:border-zinc-800">
              {useKeyboard ? (
                <TextInput
                  multiline
                  placeholder="Start typing your thought..."
                  placeholderTextColor={isDark ? '#8E8E93' : '#C7C7CC'}
                  value={displayText}
                  onChangeText={(t) => {
                    displayTextRef.current = t;
                    completedSegmentsRef.current = [t];
                    currentSegmentRef.current = '';
                    setDisplayText(t);
                  }}
                  className="text-[17px] leading-6 text-black dark:text-white text-left align-top flex-1"
                  autoFocus
                />
              ) : (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {!displayText ? (
                    <View className="items-center justify-center py-10">
                      <Text className="text-center text-[17px] text-zinc-400 dark:text-zinc-500">
                        {isRecording ? 'Listening...\nSpeak your mind clearly.' : 'Tap the microphone below\nand start speaking.'}
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-[17px] leading-6 text-black dark:text-white">
                      {displayText}
                    </Text>
                  )}
                </ScrollView>
              )}
            </View>

            {/* Controls */}
            <View className="items-center mb-8">
              <View className="flex-row items-center justify-center gap-8">
                
                {/* Keyboard Toggle */}
                <Pressable
                  onPress={() => { setUseKeyboard(v => !v); if (isRecording) stopRecording(); }}
                  className={['h-12 w-12 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-800', useKeyboard ? 'bg-zinc-100 dark:bg-zinc-800' : 'bg-white dark:bg-black'].join(' ')}
                >
                  <KeyboardIcon size={22} color={useKeyboard ? '#007AFF' : (isDark ? '#8E8E93' : '#8E8E93')} />
                </Pressable>

                {/* Main Mic Button */}
                <View className="items-center justify-center">
                  {isRecording && <View className="absolute h-24 w-24 rounded-full bg-red-100 dark:bg-red-900/30" />}
                  <Pressable
                    onPress={handleToggleRecording}
                    className={['h-[72px] w-[72px] items-center justify-center rounded-full', isRecording ? 'bg-[#FF3B30]' : 'bg-[#007AFF]'].join(' ')}
                    style={{
                      shadowColor: isRecording ? '#FF3B30' : '#007AFF', 
                      shadowOffset: { width: 0, height: 4 }, 
                      shadowOpacity: 0.3, 
                      shadowRadius: 10, 
                      elevation: 8
                    }}
                  >
                    {isRecording
                      ? <Square size={26} color="white" fill="white" />
                      : <Mic size={28} color="white" strokeWidth={2.5} />}
                  </Pressable>
                </View>

                {/* Clear Button */}
                <Pressable
                  onPress={() => {
                    completedSegmentsRef.current = [];
                    currentSegmentRef.current = '';
                    displayTextRef.current = '';
                    setDisplayText('');
                  }}
                  className="h-12 w-12 items-center justify-center rounded-full border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black"
                >
                  <Text className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400">Clear</Text>
                </Pressable>
              </View>
              <Text className={['mt-4 font-semibold tracking-wide text-[12px]', isRecording ? 'text-[#FF3B30]' : 'text-[#007AFF]'].join(' ')}>
                {isRecording ? 'LISTENING' : (useKeyboard ? 'KEYBOARD' : 'VOICE')}
              </Text>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default BrainDumpModal;
