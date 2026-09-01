import React, { useState, useRef, useEffect } from 'react';
import {
  Text,
  View,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Animated,
  Easing,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Copy, Check, Sparkles, ShieldCheck, Zap } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import * as Clipboard from 'expo-clipboard';

const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY || '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

type VibeType = 'hard_pass' | 'reschedule' | 'professional' | 'soft_decline' | 'enthusiastic_accept' | 'casual_accept';

interface VibeOption {
  id: VibeType;
  emoji: string;
  label: string;
  color: string;
  bgColor: string;
  description: string;
}

const VIBE_OPTIONS: VibeOption[] = [
  {
    id: 'enthusiastic_accept',
    emoji: '🎉',
    label: 'Hell Yes!',
    color: '#AF52DE',
    bgColor: 'rgba(175, 82, 222, 0.1)',
    description: 'Excited & ready',
  },
  {
    id: 'casual_accept',
    emoji: '👍',
    label: 'Casual Accept',
    color: '#34C759',
    bgColor: 'rgba(52, 199, 89, 0.1)',
    description: 'Chill & easygoing',
  },
  {
    id: 'hard_pass',
    emoji: '🛑',
    label: 'Hard Pass',
    color: '#FF3B30',
    bgColor: 'rgba(255, 59, 48, 0.1)',
    description: 'Polite but firm',
  },
  {
    id: 'reschedule',
    emoji: '📅',
    label: 'Reschedule',
    color: '#FF9500',
    bgColor: 'rgba(255, 149, 0, 0.1)',
    description: 'Ask for next week',
  },
  {
    id: 'professional',
    emoji: '💼',
    label: 'Professional',
    color: '#007AFF',
    bgColor: 'rgba(0, 122, 255, 0.1)',
    description: 'For coworkers',
  },
  {
    id: 'soft_decline',
    emoji: '💛',
    label: 'Soft Decline',
    color: '#FFCC00',
    bgColor: 'rgba(255, 204, 0, 0.1)',
    description: 'For close friends/family',
  },
];

const SocialBatteryScreen: React.FC = () => {
  const { isDark } = useTheme();
  const navigation = useNavigation<any>();

  const [incomingMessage, setIncomingMessage] = useState('');
  const [userIntent, setUserIntent] = useState('');
  const [selectedVibe, setSelectedVibe] = useState<VibeType | null>(null);
  const [generatedResponse, setGeneratedResponse] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState('');

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shieldGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Shield glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(shieldGlow, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(shieldGlow, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const animateResponse = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const getVibePromptLabel = (vibe: VibeType): string => {
    switch (vibe) {
      case 'hard_pass':
        return 'Hard Pass (Polite but Firm)';
      case 'reschedule':
        return 'Reschedule (Suggest another time)';
      case 'professional':
        return 'Professional Boundary (Workplace appropriate)';
      case 'soft_decline':
        return 'Soft Decline (Warm and caring for close relationships. Keep it extremely simple, casual, and like a normal text message.)';
      case 'enthusiastic_accept':
        return 'Enthusiastic Accept (Excited and ready)';
      case 'casual_accept':
        return 'Casual Accept (Chill and easygoing. Keep it extremely simple, casual, and like a normal text message.)';
    }
  };

  const generateResponse = async () => {
    if (!incomingMessage.trim()) {
      setError('Please paste the message you received.');
      return;
    }
    if (!selectedVibe) {
      setError('Please select a boundary style.');
      return;
    }

    setError('');
    setIsGenerating(true);
    setGeneratedResponse('');
    Keyboard.dismiss();

    // Pulse animation while generating
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    const vibeLabel = getVibePromptLabel(selectedVibe);

    let systemPrompt = `You are an empathetic communication coach and social boundary expert. Your job is to draft short, natural-sounding text message responses that protect the user's energy while maintaining relationships.

Rules:
- Keep it SHORT (2-4 sentences max, like a real text message)
- Sound natural and human, NOT robotic or overly formal
- Do NOT over-apologize
- Communicate the user's intent clearly but warmly
- Match the tone to the selected boundary style
- If the user provides specific instructions on what they want to say, incorporate those into the response`;

    let userPrompt = `The user received this message/email:
"${incomingMessage.trim()}"

They need to respond using a "${vibeLabel}" approach.`;

    if (userIntent.trim()) {
      userPrompt += `\n\nThe user's specific instructions for the response: "${userIntent.trim()}"`;
    }

    userPrompt += `\n\nDraft a short, warm, natural-sounding text message response. Only output the response text, nothing else.`;

    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.8,
          max_tokens: 300,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || `API request failed with status ${response.status}`);
      }

      const data = await response.json();
      const aiText = data?.choices?.[0]?.message?.content?.trim() || '';

      if (aiText) {
        setGeneratedResponse(aiText);
        animateResponse();
      } else {
        setError('AI returned an empty response. Please try again.');
      }
    } catch (err: any) {
      console.error('Groq API error:', err);
      setError(err.message || 'Failed to generate response. Check your connection.');
    } finally {
      setIsGenerating(false);
      pulseAnim.setValue(1);
    }
  };

  const handleCopy = async () => {
    if (!generatedResponse) return;
    await Clipboard.setStringAsync(generatedResponse);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const shieldOpacity = shieldGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black" edges={['top', 'left', 'right']}>
      {/* Header */}
      <View className="flex-row items-center px-5 pt-2 pb-3">
        <Pressable
          onPress={() => navigation.goBack()}
          className="p-1.5 -ml-1.5 rounded-full active:opacity-60"
          hitSlop={8}
        >
          <ArrowLeft size={24} color="#007AFF" />
        </Pressable>
        <View className="flex-1 items-center">
          <Text className="text-[17px] font-semibold text-black dark:text-white">
            Social Shield
          </Text>
        </View>
        <View className="w-8" />
      </View>
      <View className="h-[0.5px] bg-zinc-200 dark:bg-zinc-800" />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero Section */}
        <View className="items-center mb-6">
          <Animated.View
            style={{ opacity: shieldOpacity }}
            className="h-16 w-16 items-center justify-center rounded-full bg-[#007AFF]/10 mb-3"
          >
            <ShieldCheck size={32} color="#007AFF" />
          </Animated.View>
          <Text className="text-[13px] text-zinc-400 dark:text-zinc-500 text-center leading-[18px] px-4">
            Paste the message that's draining your battery. Let AI handle the diplomacy.
          </Text>
        </View>

        {/* Incoming Message Input */}
        <View className="mb-5">
          <Text className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400 mb-2 ml-1">
            INCOMING MESSAGE
          </Text>
          <View className="rounded-3xl bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <TextInput
              value={incomingMessage}
              onChangeText={(t) => {
                setIncomingMessage(t);
                if (error) setError('');
              }}
              placeholder="Paste the message you received..."
              placeholderTextColor={isDark ? '#636366' : '#C7C7CC'}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="px-4 pt-3.5 pb-4 text-[15px] text-black dark:text-white min-h-[100px]"
            />
          </View>
        </View>

        {/* User Intent Input */}
        <View className="mb-5">
          <Text className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400 mb-2 ml-1">
            YOUR INSTRUCTIONS (OPTIONAL)
          </Text>
          <View className="rounded-3xl bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <TextInput
              value={userIntent}
              onChangeText={setUserIntent}
              placeholder="e.g. Say I have a dentist appointment, mention I'm free next Saturday..."
              placeholderTextColor={isDark ? '#636366' : '#C7C7CC'}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              className="px-4 pt-3.5 pb-4 text-[15px] text-black dark:text-white min-h-[80px]"
            />
          </View>
        </View>

        {/* Boundary Buttons */}
        <View className="mb-5">
          <Text className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400 mb-2 ml-1">
            BOUNDARY STYLE
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {VIBE_OPTIONS.map((vibe) => {
              const isSelected = selectedVibe === vibe.id;
              return (
                <Pressable
                  key={vibe.id}
                  onPress={() => {
                    setSelectedVibe(vibe.id);
                    if (error) setError('');
                  }}
                  className="overflow-hidden rounded-2xl"
                  style={{ width: '48%', flexGrow: 1 }}
                >
                  <View
                    className="rounded-2xl p-3.5"
                    style={{
                      backgroundColor: isSelected ? vibe.bgColor : isDark ? '#1C1C1E' : '#F9F9F9',
                      borderWidth: 1.5,
                      borderColor: isSelected ? vibe.color : isDark ? '#2C2C2E' : '#E5E5EA',
                    }}
                  >
                    <Text className="text-[20px] mb-1">{vibe.emoji}</Text>
                    <Text
                      className="text-[14px] font-semibold mb-0.5"
                      style={{ color: isSelected ? vibe.color : isDark ? '#FFFFFF' : '#000000' }}
                    >
                      {vibe.label}
                    </Text>
                    <Text
                      className="text-[11px]"
                      style={{
                        color: isSelected
                          ? vibe.color
                          : isDark
                          ? '#8E8E93'
                          : '#8E8E93',
                        opacity: isSelected ? 0.8 : 1,
                      }}
                    >
                      {vibe.description}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Error Message */}
        {error ? (
          <View className="mb-4 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 px-4 py-3">
            <Text className="text-[13px] text-red-600 dark:text-red-400 text-center">
              {error}
            </Text>
          </View>
        ) : null}

        {/* Generate Button */}
        <Animated.View style={{ transform: [{ scale: isGenerating ? pulseAnim : 1 }] }}>
          <Pressable
            onPress={generateResponse}
            disabled={isGenerating}
            className="rounded-full py-4 flex-row items-center justify-center gap-2 active:opacity-85"
            style={{
              backgroundColor: '#007AFF',
              shadowColor: '#007AFF',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 6,
              opacity: isGenerating ? 0.85 : 1,
            }}
          >
            {isGenerating ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text className="text-[16px] font-semibold text-white">
                  Crafting your escape...
                </Text>
              </>
            ) : (
              <>
                <Sparkles size={18} color="#FFFFFF" />
                <Text className="text-[16px] font-semibold text-white">
                  Activate Social Shield
                </Text>
              </>
            )}
          </Pressable>
        </Animated.View>

        {/* Generated Response */}
        {generatedResponse ? (
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
            className="mt-6"
          >
            <View className="flex-row items-center justify-between mb-2 ml-1">
              <Text className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                YOUR READY-MADE RESPONSE
              </Text>
              <View className="flex-row items-center gap-1 rounded-full bg-[#34C759]/10 px-2.5 py-1">
                <Zap size={10} color="#34C759" />
                <Text className="text-[11px] font-semibold text-[#34C759]">AI Generated</Text>
              </View>
            </View>

            <View
              className="rounded-3xl bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 overflow-hidden"
              style={{
                shadowColor: isDark ? '#007AFF' : '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDark ? 0.15 : 0.06,
                shadowRadius: 12,
                elevation: 3,
              }}
            >
              {/* Response Text */}
              <View className="px-5 pt-5 pb-4">
                <Text className="text-[16px] leading-[26px] text-black dark:text-white">
                  {generatedResponse}
                </Text>
              </View>

              {/* Divider */}
              <View className="h-[0.5px] mx-5 bg-zinc-100 dark:bg-zinc-800" />

              {/* Copy Button */}
              <Pressable
                onPress={handleCopy}
                className="flex-row items-center justify-center gap-2 py-3.5 active:opacity-70"
                style={{
                  backgroundColor: isCopied
                    ? isDark
                      ? 'rgba(52, 199, 89, 0.08)'
                      : 'rgba(52, 199, 89, 0.05)'
                    : 'transparent',
                }}
              >
                {isCopied ? (
                  <>
                    <Check size={16} color="#34C759" strokeWidth={2.5} />
                    <Text className="text-[15px] font-semibold text-[#34C759]">
                      Copied to Clipboard!
                    </Text>
                  </>
                ) : (
                  <>
                    <Copy size={16} color="#007AFF" strokeWidth={2} />
                    <Text className="text-[15px] font-semibold text-[#007AFF]">
                      Copy Response
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </Animated.View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

export default SocialBatteryScreen;
