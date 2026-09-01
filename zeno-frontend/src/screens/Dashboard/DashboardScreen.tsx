import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Bell, ChevronDown, ChevronRight, Clock, Mic, AlertTriangle, RefreshCw, Plus, Flag } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { dashboardApi, Task, FreeTimeResponse } from '../../api/dashboardApi';
import { healthApi, StepBucketResponse, SleepRecordResponse } from '../../api/healthApi';
import { authApi, UserProfile } from '../../api/authApi';
import BrainDumpModal from '../../components/Dashboard/BrainDumpModal';
import CreateTaskModal from '../../components/Dashboard/CreateTaskModal';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

/** Format an ISO-8601 deadline string into a human-friendly label */
const formatDeadline = (deadline?: string | null): string | null => {
  if (!deadline) return null;
  const d = new Date(deadline);
  const now = new Date();

  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow =
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate();

  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (isToday) return `Today, ${time}`;
  if (isTomorrow) return `Tomorrow, ${time}`;

  const month = d.toLocaleString('default', { month: 'short' });
  return `${month} ${d.getDate()}, ${time}`;
};

/** Check if a deadline is within the next 24 hours */
const isUrgent = (deadline?: string | null): boolean => {
  if (!deadline) return false;
  const d = new Date(deadline);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  return diff > 0 && diff < 24 * 60 * 60 * 1000;
};

interface DashboardScreenProps {
  navigation: any;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const { isDark } = useTheme();
  const [energyScore, setEnergyScore] = useState<number | null>(null);
  const [stepsData, setStepsData] = useState<StepBucketResponse | null>(null);
  const [latestSleep, setLatestSleep] = useState<SleepRecordResponse | null>(null);
  const [stepsLoading, setStepsLoading] = useState(true);
  const [energyLoading, setEnergyLoading] = useState(true);
  const [needsMoodCheck, setNeedsMoodCheck] = useState(false);
  const [askConsent, setAskConsent] = useState(false);
  const [keepItLight, setKeepItLight] = useState<boolean | null>(null);
  const [empatheticMessage, setEmpatheticMessage] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [freeTimeData, setFreeTimeData] = useState<FreeTimeResponse | null>(null);
  const [freeTimeLoading, setFreeTimeLoading] = useState(false);

  const [displayTasks, setDisplayTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [isBrainDumpVisible, setIsBrainDumpVisible] = useState(false);
  const [isCreateTaskVisible, setIsCreateTaskVisible] = useState(false);
  const [showMicTooltip, setShowMicTooltip] = useState(false);
  const justSetMoodRef = useRef(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [checkedTasks, setCheckedTasks] = useState<Record<number, boolean>>({});
  const [expandedTasks, setExpandedTasks] = useState<Record<number, boolean>>({});
  const [activeTab, setActiveTab] = useState<'tasks' | 'calendar'>('tasks');

  const applyDashboardData = useCallback((data: { displayTasks: Task[]; empatheticMessage: string; askConsent: boolean }) => {
    setDisplayTasks(data.displayTasks ?? []);
    setEmpatheticMessage(data.empatheticMessage ?? null);
    const expanded: Record<number, boolean> = {};
    (data.displayTasks ?? []).forEach((t) => {
      if (t.microSteps && t.microSteps.length > 0) {
        expanded[t.id] = true;
      }
    });
    setExpandedTasks(expanded);
  }, []);

  const fetchDashboardTasks = useCallback(async (mood?: number, isLight?: boolean) => {
    try {
      if (mood === undefined) {
        console.warn("Mood is undefined, skipping dashboard tasks fetch");
        return;
      }
      setTasksLoading(true);
      const dashboardData = await dashboardApi.getDashboardTasks(isLight);
      applyDashboardData(dashboardData);
    } catch (error) {
      console.error("Failed to fetch dashboard tasks", error);
    } finally {
      setTasksLoading(false);
    }
  }, [applyDashboardData]);

  const fetchFreeTime = useCallback(async () => {
    try {
      setFreeTimeLoading(true);
      const data = await dashboardApi.getTodaysFreeTime();
      setFreeTimeData(data);
    } catch (error) {
      console.error("Failed to fetch free time", error);
    } finally {
      setFreeTimeLoading(false);
    }
  }, []);

  const fetchMoodlog = useCallback(async () => {
    setEnergyLoading(true);
    try {
      const response = await dashboardApi.getMoodlog();
      if (response.success && response.moodLog) {
        setEnergyScore(response.moodLog.energyScore);
        await fetchDashboardTasks(response.moodLog.energyScore, response.moodLog.isLight);
        fetchFreeTime();
        setNeedsMoodCheck(false);
      } else {
        setNeedsMoodCheck(true);
      }
    } catch {
      setNeedsMoodCheck(true);
      setEnergyScore(null);
    } finally {
      setEnergyLoading(false);
    }
  }, [fetchDashboardTasks, fetchFreeTime]);

  const fetchStepsToday = useCallback(async () => {
    try {
      setStepsLoading(true);
      const data = await healthApi.getStepsToday();
      if (data && data.success) {
        setStepsData(data);
      }
    } catch (error) {
      console.error("Failed to fetch steps today", error);
    } finally {
      setStepsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMoodlog();
    fetchStepsToday();
    authApi.getMe().then(setProfile).catch(console.error);
    healthApi.getLatestSleep().then(setLatestSleep).catch(console.error);
  }, [fetchMoodlog, fetchStepsToday]);

  // Pulse animation for mic tooltip glow ring
  useEffect(() => {
    if (showMicTooltip) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.4, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [showMicTooltip, pulseAnim]);

  // Dismiss tooltip when user navigates away from Dashboard
  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      setShowMicTooltip(false);
    });
    return unsubscribe;
  }, [navigation]);

  const getEnergyLabel = () => {
    if (energyLoading) return 'Loading...';
    if (energyScore === null) return 'Unknown';
    if (energyScore <= 3) return 'Low';
    if (energyScore <= 7) return 'Moderate';
    return 'High';
  };

  const getEnergyEmoji = () => {
    if (energyScore === null) return '⚡';
    if (energyScore <= 3) return '🔋';
    if (energyScore <= 7) return '⚡';
    return '🔥';
  };

  const handleMoodSelect = async (score: number) => {
    setEnergyScore(score);
    setNeedsMoodCheck(false);
    justSetMoodRef.current = true;
    if (score >= 8) {
      setAskConsent(true);
    } else {
      try {
        const response = await dashboardApi.createorupdateMoodlog(score, false);
        if (response.success && response.moodLog) {
          setEnergyScore(response.moodLog.energyScore);
          setTasksLoading(true);
          const dashboardData = await dashboardApi.getDashboardTasks();
          applyDashboardData(dashboardData);
          setTasksLoading(false);
          fetchFreeTime();
          if (justSetMoodRef.current) {
            setShowMicTooltip(true);
            justSetMoodRef.current = false;
          }
        } else {
          setNeedsMoodCheck(true);
        }
      } catch (error) {
        console.error("Failed to save mood", error);
        setNeedsMoodCheck(true);
        setEnergyScore(null);
      }
    }
  };

  const handleConsentChoice = async (isLight: boolean) => {
    setKeepItLight(isLight);
    setAskConsent(false);

    try {
      if (energyScore === null) {
        console.warn("Energy score is null, cannot update moodlog with consent choice");
        return;
      }
      const response = await dashboardApi.createorupdateMoodlog(energyScore, isLight);
      if (response.success && response.moodLog) {
        setEnergyScore(response.moodLog.energyScore);
        setTasksLoading(true);
        const dashboardData = await dashboardApi.getDashboardTasks(isLight);
        applyDashboardData(dashboardData);
        setTasksLoading(false);
        fetchFreeTime();
        if (justSetMoodRef.current) {
          setShowMicTooltip(true);
          justSetMoodRef.current = false;
        }
      } else {
        console.warn("Failed to update moodlog with consent choice, response:", response);
      }
    } catch (error) {
      console.error("Failed to fetch tasks after consent", error);
    }
  };

  const toggleTaskChecked = (taskId: number) => {
    setCheckedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const toggleParentChecked = (task: Task) => {
    const next = !checkedTasks[task.id];
    const updates: Record<number, boolean> = { [task.id]: next };
    if (task.microSteps) {
      task.microSteps.forEach((ms) => {
        updates[ms.id] = next;
      });
    }
    setCheckedTasks((prev) => ({ ...prev, ...updates }));
  };

  const toggleMicroStep = (parentTask: Task, microStepId: number) => {
    setCheckedTasks((prev) => {
      const next = { ...prev, [microStepId]: !prev[microStepId] };
      if (parentTask.microSteps) {
        const allChecked = parentTask.microSteps.every((ms) => next[ms.id]);
        next[parentTask.id] = allChecked;
      }
      return next;
    });
  };

  const toggleExpanded = (taskId: number) => {
    setExpandedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const renderCheck = (checked: boolean) => (
    <View
      className={[
        'h-[22px] w-[22px] items-center justify-center rounded-full border-[1.8px]',
        checked
          ? 'border-[#34C759] bg-[#34C759]'
          : 'border-zinc-300 dark:border-white/30 bg-transparent',
      ].join(' ')}
    >
      {checked ? (
        <Text className="text-[11px] font-bold text-white leading-[13px]">✓</Text>
      ) : null}
    </View>
  );

  const renderEffortBadge = (effort: string) => {
    const config: Record<string, { emoji: string; color: string; bg: string }> = {
      Low: { emoji: '🍃', color: 'text-green-600 dark:text-green-300', bg: 'bg-green-50/60 dark:bg-green-950/30' },
      Medium: { emoji: '⚡', color: 'text-orange-600 dark:text-orange-300', bg: 'bg-orange-50/60 dark:bg-orange-950/30' },
      High: { emoji: '🔥', color: 'text-red-600 dark:text-red-300', bg: 'bg-red-50/60 dark:bg-red-950/30' },
    };
    const c = config[effort] ?? config.Medium;
    return (
      <View className={`px-2 py-0.5 rounded-full border border-white/20 ${c.bg}`}>
        <Text className={`text-[11px] font-semibold ${c.color}`}>
          {c.emoji} {effort}
        </Text>
      </View>
    );
  };

  const renderTaskCard = (task: Task) => {
    const hasMicro = task.microSteps && task.microSteps.length > 0;
    const checked = !!checkedTasks[task.id];
    const expanded = !!expandedTasks[task.id];
    const deadline = formatDeadline(task.deadline);
    const urgent = isUrgent(task.deadline);
    const isCompleted = task.status === 'COMPLETED';

    return (
      <View
        key={task.id}
        className="mb-3 rounded-3xl bg-white/70 dark:bg-zinc-900/60 border border-white/40 dark:border-zinc-800/80 shadow-sm overflow-hidden"
        // style={{ backdropFilter: 'blur(20px)' }}
      >
        <Pressable
          className="flex-row items-center px-4 py-4"
          onPress={() => { setShowMicTooltip(false); navigation.navigate('TaskDetail', { taskId: task.id }); }}
          android_ripple={{ color: isDark ? '#3a3a3c' : '#E5E5EA' }}
        >
          <Pressable
            hitSlop={10}
            onPress={(e) => {
              e.stopPropagation();
              if (hasMicro) toggleParentChecked(task);
              else toggleTaskChecked(task.id);
            }}
            className="mr-3"
          >
            {renderCheck(checked || isCompleted)}
          </Pressable>

          <View className="flex-1 mr-2">
            <View className="flex-row items-center gap-2">
              <Text
                className={[
                  'flex-1 text-[16px] font-semibold tracking-tight',
                  (checked || isCompleted)
                    ? 'text-zinc-400 line-through dark:text-zinc-600'
                    : 'text-zinc-900 dark:text-zinc-100',
                ].join(' ')}
                numberOfLines={2}
              >
                {task.title}
              </Text>
              {task.is_critical && (
                <Flag size={13} color="#FF3B30" fill="#FF3B30" />
              )}
            </View>

            <View className="flex-row items-center gap-3 mt-2">
              {renderEffortBadge(task.effort_level)}
              {deadline && (
                <View className="flex-row items-center gap-1 bg-zinc-100/50 dark:bg-zinc-800/40 px-2 py-0.5 rounded-full border border-white/10">
                  {urgent ? (
                    <AlertTriangle size={10} color="#FF3B30" strokeWidth={2.4} />
                  ) : (
                    <Clock size={10} color="#8E8E93" strokeWidth={2.4} />
                  )}
                  <Text className={`text-[11px] font-medium ${urgent ? 'text-red-500 font-semibold' : 'text-zinc-500 dark:text-zinc-400'}`}>
                    {deadline}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {hasMicro && (
            <Pressable
              onPress={(e) => { e.stopPropagation(); toggleExpanded(task.id); }}
              hitSlop={10}
              className="p-1 rounded-full bg-zinc-100/80 dark:bg-zinc-800/60 border border-white/20"
            >
              {expanded
                ? <ChevronDown size={14} color={isDark ? '#A1A1AA' : '#52525B'} strokeWidth={2.5} />
                : <ChevronRight size={14} color={isDark ? '#A1A1AA' : '#52525B'} strokeWidth={2.5} />
              }
            </Pressable>
          )}
        </Pressable>

        {hasMicro && expanded && task.microSteps ? (
          <View className="border-t border-white/30 dark:border-zinc-800/50 bg-white/40 dark:bg-zinc-950/20">
            {task.microSteps.map((step, index) => {
              const stepChecked = !!checkedTasks[step.id];
              const isLast = index === task.microSteps!.length - 1;
              return (
                <Pressable
                  key={step.id}
                  className={`flex-row items-center pl-[52px] pr-4 py-3 ${!isLast ? 'border-b border-white/20 dark:border-zinc-800/30' : ''}`}
                  onPress={() => { setShowMicTooltip(false); navigation.navigate('TaskDetail', { taskId: step.id }); }}
                  android_ripple={{ color: isDark ? '#3a3a3c' : '#E5E5EA' }}
                >
                  <Pressable
                    hitSlop={8}
                    onPress={(e) => { e.stopPropagation(); toggleMicroStep(task, step.id); }}
                    className="mr-3"
                  >
                    {renderCheck(stepChecked)}
                  </Pressable>
                  <View className="flex-1">
                    <Text
                      className={[
                        'text-[14px] font-medium',
                        stepChecked
                          ? 'text-zinc-400 line-through dark:text-zinc-600'
                          : 'text-zinc-700 dark:text-zinc-300',
                      ].join(' ')}
                    >
                      {step.title}
                    </Text>
                    {step.deadline && (
                      <Text className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                        {formatDeadline(step.deadline)}
                      </Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>
    );
  };

  const renderMoodCheckModal = () => (
    <Modal transparent visible={needsMoodCheck && !energyLoading} animationType="fade">
      <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.4)', justifyContent: 'center', paddingHorizontal: 24 }}>
        <View style={{
          backgroundColor: isDark ? 'rgba(24,24,27,0.85)' : 'rgba(255,255,255,0.9)',
          borderRadius: 32,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.6)',
          paddingTop: 32,
          paddingBottom: 28,
          paddingHorizontal: 24,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.3,
          shadowRadius: 30,
          elevation: 10,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 16 }}>
            <View style={{
              height: 26, width: 26, borderRadius: 8,
              backgroundColor: 'rgba(0,122,255,0.15)',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 13 }}>🎯</Text>
            </View>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#007AFF', letterSpacing: 0.5 }}>Mood Check</Text>
          </View>

          <Text style={{ fontSize: 19, fontWeight: '800', textAlign: 'center', color: isDark ? '#fff' : '#1c1c1e', letterSpacing: -0.3, marginBottom: 8 }}>
            {latestSleep?.success && latestSleep.totalSleepHours !== null && latestSleep.totalSleepHours < (profile?.sleepTarget ? profile.sleepTarget - 1.5 : 6)
              ? "I see you had a rough night of sleep."
              : "How's your energy right now?"}
          </Text>

          <Text style={{ fontSize: 14, textAlign: 'center', color: isDark ? '#a1a1aa' : '#52525b', lineHeight: 20, marginBottom: 28 }}>
            {latestSleep?.success && latestSleep.totalSleepHours !== null && latestSleep.totalSleepHours < (profile?.sleepTarget ? profile.sleepTarget - 1.5 : 6)
              ? "I've prepared a 'Rest Mode' schedule for today, but how are you actually feeling?"
              : "Log your energy level so we can personalize your tasks for today."}
          </Text>

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
            {[
              { score: 2, emoji: '🥱', label: 'Low' },
              { score: 5, emoji: '😌', label: 'Okay' },
              { score: 9, emoji: '⚡', label: 'High' }
            ].map((item) => (
              <Pressable
                key={item.score}
                onPress={() => handleMoodSelect(item.score)}
                android_ripple={{ color: isDark ? '#27272a' : '#e4e4e7', radius: 36 }}
                style={({ pressed }) => ({
                  alignItems: 'center',
                  width: 76,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <View style={{
                  height: 64, width: 64, borderRadius: 20,
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                  marginBottom: 8,
                }}>
                  <Text style={{ fontSize: 30 }}>{item.emoji}</Text>
                </View>
                <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? '#a1a1aa' : '#52525b' }}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderConsentPopup = () => (
    <Modal transparent visible={askConsent} animationType="fade" onRequestClose={() => setAskConsent(false)}>
      <View className="flex-1 items-center justify-center bg-black/60 px-8">
        <View className="w-full rounded-[32px] bg-white/90 dark:bg-zinc-900/90 border border-white/50 dark:border-zinc-800/80 overflow-hidden shadow-2xl">
          <View className="px-6 pt-8 pb-6 items-center">
            <Text className="text-4xl mb-3">💪</Text>
            <Text className="text-2xl font-bold text-zinc-900 dark:text-white text-center tracking-tight">High Energy Detected!</Text>
            <Text className="mt-2 text-[14px] leading-5 text-zinc-500 dark:text-zinc-400 text-center font-medium">
              You're feeling great today. Do you want to tackle your most difficult tasks, or keep your day light?
            </Text>
          </View>
          <View className="border-t border-zinc-200/50 dark:border-zinc-800/60 bg-white/30 dark:bg-zinc-950/20">
            <Pressable onPress={() => handleConsentChoice(false)} className="py-4 items-center border-b border-zinc-200/50 dark:border-zinc-800/60 active:bg-zinc-100/50 dark:active:bg-zinc-800/50">
              <Text className="text-[17px] font-bold text-[#007AFF]">Let's Crush It!</Text>
            </Pressable>
            <Pressable onPress={() => handleConsentChoice(true)} className="py-4 items-center active:bg-zinc-100/50 dark:active:bg-zinc-800/50">
              <Text className="text-[17px] font-medium text-zinc-600 dark:text-zinc-400">Keep It Light</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );

  const topLevelTasks = displayTasks.filter((t) => {
    if (t.parentTaskId) return false;
    if (activeTab === 'tasks') return !t.isFromCalender;
    return !!t.isFromCalender;
  });

  const pendingCount = topLevelTasks.filter((t) => !checkedTasks[t.id]).length;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      {/* Background radial glowing effects for liquid glass look */}
      <View className="absolute top-[-50px] left-[-30px] w-[250px] h-[250px] rounded-full bg-blue-400/10 dark:bg-blue-500/5 blur-3xl pointer-events-none" />
      <View className="absolute top-[200px] right-[-50px] w-[300px] h-[300px] rounded-full bg-purple-400/10 dark:bg-purple-500/5 blur-3xl pointer-events-none" />

      <View className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 150 }}
        >
          {/* ─── Compact Consolidated Header ─── */}
          <View className="flex-row items-center justify-between mb-6">
            <View>
              <Text className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-500">
                {getGreeting()}
              </Text>
              <Text className="text-3xl font-extrabold tracking-tight text-black dark:text-white mt-0.5">
                {profile?.fname || 'There'} 👋
              </Text>
            </View>

            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => {
                  fetchMoodlog();
                  fetchStepsToday();
                }}
                className="h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-white/70 dark:border-zinc-800/80 dark:bg-zinc-900/60 shadow-sm"
                android_ripple={{ color: isDark ? '#3a3a3c' : '#E5E5EA', radius: 20 }}
              >
                <RefreshCw size={15} color={isDark ? '#A1A1AA' : '#52525B'} strokeWidth={2.5} />
              </Pressable>

              <Pressable
                className="h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-white/70 dark:border-zinc-800/80 dark:bg-zinc-900/60 shadow-sm"
                android_ripple={{ color: isDark ? '#3a3a3c' : '#E5E5EA', radius: 20 }}
              >
                <Bell size={16} color={isDark ? '#A1A1AA' : '#52525B'} strokeWidth={2.5} />
              </Pressable>
            </View>
          </View>

          {/* ─── Unified Liquid Glass Insights Card ─── */}
          <View 
            className="rounded-[32px] bg-white/60 dark:bg-zinc-900/50 border border-white/50 dark:border-zinc-800/70 p-5 mb-6 shadow-sm shadow-zinc-200/50 dark:shadow-none"
          >
            {/* Status Metrics Strip */}
            <View className="flex-row items-center justify-between pb-4 border-b border-zinc-200/50 dark:border-zinc-800/40">
              <View className="flex-row items-center gap-3">
                <View className="h-9 w-9 rounded-xl bg-amber-100/70 dark:bg-amber-500/10 items-center justify-center border border-amber-200/30">
                  <Text className="text-lg leading-5">{getEnergyEmoji()}</Text>
                </View>
                <View>
                  <Text className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400 dark:text-zinc-500">Energy Level</Text>
                  <Text className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">
                    {energyLoading ? 'Loading...' : `${getEnergyLabel()} (${energyScore !== null ? energyScore * 10 : '--'}%)`}
                  </Text>
                </View>
              </View>

              {!needsMoodCheck && !energyLoading && freeTimeData?.totalFreeTimeInMinutes !== undefined && (
                <View className="flex-row items-center gap-3 border-l border-zinc-200/60 dark:border-zinc-800/40 pl-5">
                  <View className="h-9 w-9 rounded-xl bg-green-100/70 dark:bg-green-500/10 items-center justify-center border border-green-200/30">
                    <Clock size={15} color="#34C759" strokeWidth={2.5} />
                  </View>
                  <View>
                    <Text className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400 dark:text-zinc-500">Free Windows</Text>
                    <Text className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">
                      {freeTimeLoading ? 'Loading...' : `${Math.floor(freeTimeData.totalFreeTimeInMinutes / 60)}h ${freeTimeData.totalFreeTimeInMinutes % 60}m`}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* AI Context Placement */}
            <View className="pt-4 px-0.5">
              {needsMoodCheck ? (
                <Text className="text-[14px] text-zinc-500 dark:text-zinc-400 leading-6 font-medium">
                  To sync your daily priorities, log your current energy level above to customize your focus playbook.
                </Text>
              ) : (
                <Text className="text-[14px] text-zinc-600 dark:text-zinc-300 leading-6 font-medium">
                  {empatheticMessage
                    ? empatheticMessage
                    : tasksLoading
                      ? 'Syncing today\'s playbook...'
                      : `${pendingCount === 0 ? '✨ All clear for now! Enjoy your day.' : `📅 You have ${pendingCount} active target${pendingCount !== 1 ? 's' : ''} left to clear today.`}`
                  }
                </Text>
              )}
            </View>

            {/* Horizontal Free Time Badge Carousels */}
            {!needsMoodCheck && !energyLoading && !freeTimeLoading && freeTimeData?.freeTimeSlots && freeTimeData.freeTimeSlots.length > 0 && (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                className="mt-4 pt-3 border-t border-dashed border-zinc-200 dark:border-zinc-800"
                contentContainerStyle={{ gap: 8 }}
              >
                {freeTimeData.freeTimeSlots.map((slot, idx) => (
                  <View key={idx} className="rounded-full bg-white/80 dark:bg-zinc-800/80 border border-white/40 dark:border-zinc-700/60 px-3 py-1.5 flex-row items-center shadow-xs">
                    <Text className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                      ⏱️ {slot.from} - {slot.to}
                    </Text>
                    <Text className="text-[10px] font-bold text-[#007AFF] dark:text-blue-400 ml-1.5 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded-full">
                      {slot.durationInMinutes}m
                    </Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          {/* ─── Tasks Section Header ─── */}
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 ml-1">
              Your Tasks
            </Text>
            <View className="flex-row items-center gap-3">
              <Text className="text-[13px] font-semibold text-zinc-400 dark:text-zinc-500">
                {pendingCount} pending
              </Text>
              <Pressable
                onPress={() => setIsCreateTaskVisible(true)}
                className="h-8 w-8 items-center justify-center rounded-full bg-[#007AFF] active:opacity-80"
                style={{ shadowColor: '#007AFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 }}
              >
                <Plus size={15} color="#FFFFFF" strokeWidth={3} />
              </Pressable>
            </View>
          </View>

          {/* Navigation Tab Selectors */}
          <View className="flex-row rounded-2xl bg-zinc-200/60 dark:bg-zinc-900/80 p-1 mb-5 border border-white/20">
            <Pressable
              onPress={() => setActiveTab('tasks')}
              className={`flex-1 py-2.5 rounded-xl items-center justify-center ${activeTab === 'tasks' ? 'bg-white dark:bg-zinc-800 shadow-xs border border-white/30' : ''}`}
            >
              <Text className={`text-sm font-bold ${activeTab === 'tasks' ? 'text-black dark:text-white' : 'text-zinc-400'}`}>
                My Tasks
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setActiveTab('calendar')}
              className={`flex-1 py-2.5 rounded-xl items-center justify-center ${activeTab === 'calendar' ? 'bg-white dark:bg-zinc-800 shadow-xs border border-white/30' : ''}`}
            >
              <Text className={`text-sm font-bold ${activeTab === 'calendar' ? 'text-black dark:text-white' : 'text-zinc-400'}`}>
                Calendar
              </Text>
            </Pressable>
          </View>

          {/* Task Engine Views */}
          {tasksLoading ? (
            <View className="items-center py-12 rounded-3xl bg-white/50 dark:bg-zinc-900/40 border border-white/30 dark:border-zinc-900">
              <Text className="text-[14px] font-semibold text-zinc-400 dark:text-zinc-500">Loading tasks...</Text>
            </View>
          ) : needsMoodCheck ? (
            <View className="items-center py-10 rounded-3xl bg-white/60 dark:bg-zinc-900/40 border border-white/40 dark:border-zinc-900/60 px-6 shadow-sm">
              <Text className="text-3xl mb-2">👋</Text>
              <Text className="text-[15px] font-bold text-black dark:text-white text-center">Let's check in first!</Text>
              <Text className="text-[13px] text-zinc-400 dark:text-zinc-500 mt-1.5 text-center leading-5 font-medium">
                Log your energy level above to synchronize your customized workflows.
              </Text>
            </View>
          ) : topLevelTasks.length === 0 && !energyLoading ? (
            <View className="items-center py-12 rounded-3xl bg-white/60 dark:bg-zinc-900/40 border border-white/40 dark:border-zinc-900/60 shadow-sm">
              <Text className="text-3xl mb-2">🎉</Text>
              <Text className="text-[15px] font-bold text-black dark:text-white">All caught up!</Text>
              <Text className="text-[13px] text-zinc-400 dark:text-zinc-500 mt-1 font-medium">No pending tasks. Enjoy your day!</Text>
            </View>
          ) : (
            <>
              {topLevelTasks.map((task) => renderTaskCard(task))}

              <Pressable
                className="mt-3 mb-4 flex-row items-center justify-center rounded-2xl border border-white/50 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/40 py-4 active:opacity-75 shadow-xs"
                onPress={() => { setShowMicTooltip(false); navigation.navigate('AllTasks'); }}
              >
                <Text className="text-[15px] font-bold text-[#007AFF] mr-1">View All Tasks</Text>
                <ChevronRight size={15} color="#007AFF" strokeWidth={2.5} />
              </Pressable>
            </>
          )}
        </ScrollView>
      </View>

      {/* ─── Premium Liquid Glass AI Voice FAB ─── */}
      <View className="absolute bottom-6 right-6" pointerEvents="box-none">
        {/* Tooltip with fluid glass arrow */}
        {showMicTooltip && (
          <View style={{ position: 'absolute', bottom: 74, right: -4, alignItems: 'flex-end', zIndex: 10 }}>
            <View style={{
              backgroundColor: 'rgba(28,28,30,0.92)',
              borderRadius: 18,
              paddingHorizontal: 16,
              paddingVertical: 12,
              shadowColor: '#007AFF',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.3,
              shadowRadius: 16,
              elevation: 10,
              borderWidth: 1,
              borderColor: 'rgba(0,122,255,0.4)',
              minWidth: 200,
            }}>
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700', textAlign: 'center' }}>
                🎙️ Voice Brain Dump
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '500', textAlign: 'center', marginTop: 3 }}>
                Tap to clear your mind out loud
              </Text>
            </View>
            <View style={{
              width: 0, height: 0,
              borderLeftWidth: 8, borderRightWidth: 8, borderTopWidth: 10,
              borderLeftColor: 'transparent', borderRightColor: 'transparent',
              borderTopColor: 'rgba(28,28,30,0.92)',
              marginRight: 22, marginTop: -1,
            }} />
          </View>
        )}

        {/* Dynamic fluid pulse background ring */}
        {showMicTooltip && (
          <Animated.View
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              borderRadius: 30,
              backgroundColor: 'rgba(0,122,255,0.25)',
              transform: [{ scale: pulseAnim }],
            }}
          />
        )}

        <Pressable
          onPress={async () => {
            setShowMicTooltip(false);
            // Request mic permission BEFORE opening Modal (Activity is attached here)
            try {
              const perm = await ExpoSpeechRecognitionModule.getPermissionsAsync();
              if (!perm.granted) {
                await ExpoSpeechRecognitionModule.requestPermissionsAsync();
              }
            } catch (e) {
              console.warn('[Dashboard] pre-request permission failed:', e);
            }
            setIsBrainDumpVisible(true);
          }}
          className="h-14 w-14 items-center justify-center rounded-full bg-[#007AFF]"
          style={{
            shadowColor: '#007AFF',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <Mic size={22} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>
      </View>

      {renderMoodCheckModal()}
      {renderConsentPopup()}
      
      <BrainDumpModal
        isVisible={isBrainDumpVisible}
        onClose={() => setIsBrainDumpVisible(false)}
        onSave={(text: string) => fetchMoodlog()}
      />
      <CreateTaskModal
        isVisible={isCreateTaskVisible}
        onClose={() => setIsCreateTaskVisible(false)}
        onSave={() => fetchMoodlog()}
      />
    </SafeAreaView>
  );
};

export default DashboardScreen;