import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Activity,
  Heart,
  ChevronRight,
  ChevronLeft,
  Moon,
  Smile,
  Info,
  AlertTriangle,
} from 'lucide-react-native';
import { healthApi, StepBucketResponse, SleepRecordResponse } from '../../api/healthApi';
import { authApi, UserProfile } from '../../api/authApi';
import { dashboardApi, MoodLog } from '../../api/dashboardApi';
import { useTheme } from '../../theme/ThemeContext';

const { width } = Dimensions.get('window');

interface HealthScreenProps {
  navigation: any;
}

const HealthScreen: React.FC<HealthScreenProps> = ({ navigation }) => {
  const { isDark } = useTheme();

  // API states
  const [stepsData, setStepsData] = useState<StepBucketResponse | null>(null);
  const [sleepData, setSleepData] = useState<SleepRecordResponse | null>(null);
  const [weeklySleepData, setWeeklySleepData] = useState<SleepRecordResponse[] | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [mood, setMood] = useState<MoodLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Detail Modal states
  const [activeModalMetric, setActiveModalMetric] = useState<'steps' | 'distance' | 'move' | 'sleep' | null>(null);
  const [modalTimeframe, setModalTimeframe] = useState<'D' | 'W' | 'M' | 'Y'>('D');

  // Load health data
  useEffect(() => {
    fetchHealthData();
  }, []);

  const fetchHealthData = async () => {
    try {
      setLoading(true);
      const [stepsRes, profileRes, moodRes, sleepRes, weeklySleepRes] = await Promise.all([
        healthApi.getStepsToday().catch(() => null),
        authApi.getMe().catch(() => null),
        dashboardApi.getMoodlog().catch(() => null),
        healthApi.getLatestSleep().catch(() => null),
        healthApi.getWeeklySleep().catch(() => null),
      ]);

      if (stepsRes) setStepsData(stepsRes);
      if (profileRes) setProfile(profileRes);
      if (moodRes && moodRes.success) setMood(moodRes.moodLog);
      if (sleepRes) setSleepData(sleepRes);
      console.log('Latest Sleep:', sleepRes);
      if (weeklySleepRes) setWeeklySleepData(weeklySleepRes);
    } catch (err) {
      console.error('Failed to load health statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchHealthData();
    setRefreshing(false);
  };

  // Calculations
  const steps = stepsData?.totalSteps ?? 0;
  const heightCm = profile?.height ?? 170; // fallback to 170cm if not set
  const strideLengthM = (heightCm * 0.413) / 100;
  const distanceM = steps * strideLengthM;
  const distanceMiles = distanceM / 1609.344;
  const caloriesBurned = Math.round(steps * 0.04);

  // Targets
  const stepTarget = 10000;
  const calorieTarget = 3000 * 0.15; // 450 calories target
  const distanceTargetMiles = 5.0;

  // Distribute bucket steps into 24 hours
  const getHourlySteps = () => {
    const hourly = new Array(24).fill(0);
    if (!stepsData) return hourly;

    // Distribute bucket 1 (7 AM - 11 AM)
    if (stepsData.bucket1 > 0) {
      hourly[8] = Math.round(stepsData.bucket1 * 0.4);
      hourly[9] = Math.round(stepsData.bucket1 * 0.6);
    }
    // Distribute bucket 2 (11 AM - 3 PM)
    if (stepsData.bucket2 > 0) {
      hourly[12] = Math.round(stepsData.bucket2 * 0.7);
      hourly[13] = Math.round(stepsData.bucket2 * 0.3);
    }
    // Distribute bucket 3 (3 PM - 7 PM)
    if (stepsData.bucket3 > 0) {
      hourly[16] = Math.round(stepsData.bucket3 * 0.5);
      hourly[17] = Math.round(stepsData.bucket3 * 0.5);
    }
    // Distribute bucket 4 (7 PM - 9 PM)
    if (stepsData.bucket4 > 0) {
      hourly[20] = stepsData.bucket4;
    }

    return hourly;
  };
  const hourlySteps = getHourlySteps();

  // Helper to render inline hourly mini-bars on card
  const renderCardChart = (colorClass: string, dataArray: number[], maxVal = 1000) => {
    const peak = Math.max(...dataArray, maxVal);

    return (
      <View className="flex-row items-end justify-between h-[50px] w-full px-1 mt-4">
        {dataArray.map((val, index) => {
          const heightPercent = val > 0 ? Math.max((val / peak) * 100, 10) : 0;
          return (
            <View key={index} className="items-center flex-1 h-full justify-end">
              {/* Hour Grid Guide */}
              <View className="absolute bottom-0 w-[1px] h-full bg-zinc-100 dark:bg-zinc-800/60" />
              {/* Actual step bar */}
              {heightPercent > 0 && (
                <View
                  style={{ height: `${heightPercent}%` }}
                  className={`w-[3.5px] rounded-t-full ${colorClass} z-10`}
                />
              )}
            </View>
          );
        })}
      </View>
    );
  };

  // Helper to format date
  const getFormattedDate = () => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'short', day: 'numeric' };
    return new Date().toLocaleDateString('en-US', options).toUpperCase();
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-black justify-center items-center">
        <ActivityIndicator size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  // Calculate move progress ring segment
  const caloriePercent = Math.min((caloriesBurned / calorieTarget) * 100, 100);

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black">
      {/* Ambient background blur blobs - placed in fixed layout behind scroll view */}
      <View className="absolute -left-12 -top-6 h-32 w-32 rounded-full bg-indigo-200/30 dark:bg-indigo-950/20 pointer-events-none" />
      <View className="absolute -right-12 top-28 h-28 w-28 rounded-full bg-sky-200/30 dark:bg-sky-950/20 pointer-events-none" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 130 }}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mt-1 mb-6">
          <View>
            <Text className="text-zinc-400 dark:text-zinc-500 text-[10px] font-bold uppercase tracking-[1.5px]">
              {getFormattedDate()}
            </Text>
            <Text className="text-[34px] font-bold tracking-tight text-zinc-900 dark:text-white">Summary</Text>
          </View>
          {/* Profile Initials Circle */}
          <View className="h-10 w-10 items-center justify-center rounded-full bg-[#007AFF]/10 dark:bg-[#007AFF]/20 border border-[#007AFF]/15">
            <Text className="text-sm font-bold text-[#007AFF]">
              {profile ? `${profile.fname.charAt(0)}${profile.lname ? profile.lname.charAt(0) : ''}`.toUpperCase() : 'U'}
            </Text>
          </View>
        </View>

        {/* Ring Card (Move / Activity) */}
        <Pressable
          onPress={() => {
            setActiveModalMetric('move');
            setModalTimeframe('D');
          }}
          className="rounded-[28px] border border-zinc-200 bg-white dark:border-zinc-800/80 dark:bg-zinc-900/40 px-5 pt-5 pb-6 shadow-sm mb-4"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.05 : 0.02,
            shadowRadius: 8,
          }}
        >
          <Text className="text-[10px] font-bold uppercase tracking-[1.5px] text-zinc-500 dark:text-zinc-400">Activity Ring</Text>
          <View className="flex-row items-center mt-4">
            {/* Visual Ring representation */}
            <View className="relative h-28 w-28 items-center justify-center mr-6">
              {/* Background Track Circle */}
              <View className="absolute h-24 w-24 rounded-full border-[10px] border-[#FF004F]/10 dark:border-[#FF004F]/20" />
              {/* Solid Progress Segment representation */}
              <View className="absolute h-24 w-24 rounded-full border-[10px] border-transparent border-t-[#FF004F] border-r-[#FF004F] items-center justify-center"
                style={{
                  transform: [{ rotate: `${(caloriePercent / 100) * 360 - 90}deg` }],
                }}
              />
              <View className="absolute h-20 w-20 rounded-full bg-white dark:bg-zinc-900 items-center justify-center">
                <Text className="text-2xl">🔥</Text>
              </View>
            </View>

            {/* Move metrics */}
            <View className="flex-1">
              <Text className="text-[13px] font-semibold text-zinc-500 dark:text-zinc-400">Move</Text>
              <View className="flex-row items-baseline mt-1">
                <Text className="text-3xl font-extrabold text-[#FF004F]">{caloriesBurned}</Text>
                <Text className="text-lg font-bold text-zinc-400 dark:text-zinc-500">/{Math.round(calorieTarget)}</Text>
                <Text className="text-xs font-bold text-[#FF004F] ml-1 uppercase">Cal</Text>
              </View>
              {/* Progress bar */}
              <View className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mt-3.5">
                <View
                  style={{ width: `${caloriePercent}%` }}
                  className="h-full bg-[#FF004F] rounded-full"
                />
              </View>
            </View>
          </View>
        </Pressable>
        
        {/* 2-Column widgets */}
        <View className="flex-row gap-4 mb-4">
          {/* Steps count widget */}
          <Pressable
            onPress={() => {
              setActiveModalMetric('steps');
              setModalTimeframe('D');
            }}
            className="flex-1 rounded-[28px] border border-zinc-200 bg-white dark:border-zinc-800/80 dark:bg-zinc-900/40 px-5 pt-5 pb-6"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDark ? 0.05 : 0.02,
              shadowRadius: 8,
            }}
          >
            <View className="flex-row justify-between items-center">
              <Text className="text-[10px] font-bold uppercase tracking-[1.2px] text-zinc-500 dark:text-zinc-400">Steps</Text>
              <ChevronRight size={14} color="#8E8E93" />
            </View>
            <Text className="text-[11px] text-zinc-500 dark:text-zinc-500 mt-1">Today</Text>
            <View className="flex-row items-baseline mt-1.5">
              <Text className="text-[26px] font-extrabold text-[#AF52DE] dark:text-[#C57BFA]">{steps.toLocaleString()}</Text>
            </View>

            {/* Steps chart */}
            {renderCardChart('bg-[#AF52DE] dark:bg-[#C57BFA]', hourlySteps, 300)}

            {/* Timestamps - padded inwards to prevent corner clipping */}
            <View className="flex-row justify-between mt-2.5 px-2">
              <Text className="text-[8px] font-bold text-zinc-400 dark:text-zinc-600">12 AM</Text>
              <Text className="text-[8px] font-bold text-zinc-400 dark:text-zinc-600">12 PM</Text>
              <Text className="text-[8px] font-bold text-zinc-400 dark:text-zinc-600">6 PM</Text>
            </View>
          </Pressable>

          {/* Distance widget */}
          <Pressable
            onPress={() => {
              setActiveModalMetric('distance');
              setModalTimeframe('D');
            }}
            className="flex-1 rounded-[28px] border border-zinc-200 bg-white dark:border-zinc-800/80 dark:bg-zinc-900/40 px-5 pt-5 pb-6"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDark ? 0.05 : 0.02,
              shadowRadius: 8,
            }}
          >
            <View className="flex-row justify-between items-center">
              <Text className="text-[10px] font-bold uppercase tracking-[1.2px] text-zinc-500 dark:text-zinc-400">Distance</Text>
              <ChevronRight size={14} color="#8E8E93" />
            </View>
            <Text className="text-[11px] text-zinc-500 dark:text-zinc-500 mt-1">Today</Text>
            <View className="flex-row items-baseline mt-1.5">
              <Text className="text-[26px] font-extrabold text-[#00B4D8] dark:text-[#00E5FF]">{distanceMiles.toFixed(2)}</Text>
              <Text className="text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-500 ml-1">MI</Text>
            </View>

            {/* Distance chart */}
            {renderCardChart('bg-[#00B4D8] dark:bg-[#00E5FF]', hourlySteps, 300)}

            {/* Timestamps - padded inwards to prevent corner clipping */}
            <View className="flex-row justify-between mt-2.5 px-2">
              <Text className="text-[8px] font-bold text-zinc-400 dark:text-zinc-600">12 AM</Text>
              <Text className="text-[8px] font-bold text-zinc-400 dark:text-zinc-600">12 PM</Text>
              <Text className="text-[8px] font-bold text-zinc-400 dark:text-zinc-600">6 PM</Text>
            </View>
          </Pressable>
        </View>

        {/* Sleep Card — Live Data */}
        <Pressable
          onPress={() => {
            setActiveModalMetric('sleep');
            setModalTimeframe('D');
          }}
          className="rounded-[28px] border border-zinc-200 bg-white dark:border-zinc-800/80 dark:bg-zinc-900/40 px-5 pt-5 pb-6 mb-4"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.05 : 0.02,
            shadowRadius: 8,
          }}
        >
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center gap-2">
              <Moon size={15} color="#34C759" />
              <Text className="text-[10px] font-bold uppercase tracking-[1.5px] text-zinc-500 dark:text-zinc-400">Sleep</Text>
            </View>
            <ChevronRight size={14} color="#8E8E93" />
          </View>
          <View className="flex-row items-baseline justify-between mt-4">
            <View>
              <Text className="text-xs text-zinc-400 dark:text-zinc-500">Last Night</Text>
              {sleepData?.success && sleepData.totalSleepHours != null ? (
                <Text className="text-3xl font-extrabold text-[#34C759] dark:text-[#30D158] mt-1">
                  {Math.floor(sleepData.totalSleepHours)}h {Math.round((sleepData.totalSleepHours % 1) * 60)}m
                </Text>
              ) : (
                <Text className="text-lg font-semibold text-zinc-400 dark:text-zinc-500 mt-1">No data yet</Text>
              )}
            </View>
            <View className="items-end">
              <Text className="text-[9px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Target: {profile?.sleepTarget ?? 8}h</Text>
              {sleepData?.success && sleepData.totalSleepHours != null ? (
                <Text className={`text-[11px] font-bold mt-0.5 ${sleepData.totalSleepHours >= ((profile?.sleepTarget ?? 8) * 0.875) ? 'text-emerald-500' : sleepData.totalSleepHours >= ((profile?.sleepTarget ?? 8) * 0.625) ? 'text-amber-500' : 'text-red-500'}`}>
                  {Math.round((sleepData.totalSleepHours / (profile?.sleepTarget ?? 8)) * 100)}% of goal
                </Text>
              ) : (
                <Text className="text-[11px] font-bold text-zinc-400 mt-0.5">--</Text>
              )}
            </View>
          </View>
          {/* Sleep quality bar */}
          {sleepData?.success && sleepData.totalSleepHours != null ? (
            <>
              <View className="h-4 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden flex-row mt-4.5">
                <View
                  style={{ flex: Math.min(sleepData.totalSleepHours / (profile?.sleepTarget ?? 8), 1) }}
                  className={`rounded-full ${
                    sleepData.totalSleepHours >= ((profile?.sleepTarget ?? 8) * 0.875) ? 'bg-emerald-500' : sleepData.totalSleepHours >= ((profile?.sleepTarget ?? 8) * 0.625) ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                />
                <View style={{ flex: Math.max(1 - sleepData.totalSleepHours / (profile?.sleepTarget ?? 8), 0) }} />
              </View>
              <View className="flex-row justify-between items-center mt-3 px-2">
                {sleepData.sleepStartTime != null && (
                  <Text className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500">
                    Slept {new Date(sleepData.sleepStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                )}
                {sleepData.sleepEndTime != null && (
                  <Text className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500">
                    Woke {new Date(sleepData.sleepEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                )}
                {(sleepData.microAwakeningsCount ?? 0) > 0 && (
                  <View className="flex-row items-center gap-1">
                    <AlertTriangle size={9} color="#F59E0B" />
                    <Text className="text-[9px] font-bold text-amber-500">{sleepData.microAwakeningsCount} wake-up{(sleepData.microAwakeningsCount ?? 0) > 1 ? 's' : ''}</Text>
                  </View>
                )}
              </View>
            </>
          ) : (
            <View className="h-4 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mt-4.5" />
          )}
        </Pressable>

        {/* Mood & Energy Section */}
        <View
          className="rounded-[28px] border border-zinc-200 bg-white dark:bg-zinc-900/40 px-5 pt-5 pb-6 border-zinc-200 dark:border-zinc-800/80"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.05 : 0.02,
            shadowRadius: 8,
          }}
        >
          <View className="flex-row items-center gap-2 mb-3.5">
            <Smile size={15} color="#007AFF" />
            <Text className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#007AFF] dark:text-indigo-300">Energy & Mood</Text>
          </View>
          {mood ? (
            <View className="flex-row items-center justify-between">
              <View className="flex-1 mr-3">
                <Text className="text-[16px] font-bold text-zinc-900 dark:text-white">
                  Energy level: {mood.energyScore}/10
                </Text>
                <Text className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-[18px]">
                  Logged energy score via dashboard widgets.
                </Text>
              </View>
              <View className="h-11 w-11 items-center justify-center rounded-xl bg-[#007AFF]/5 dark:bg-[#007AFF]/15 border border-[#007AFF]/10">
                <Text className="text-xl">{mood.energyScore >= 8 ? '⚡' : mood.energyScore >= 4 ? '😌' : '🥱'}</Text>
              </View>
            </View>
          ) : (
            <Text className="text-sm text-zinc-400 dark:text-zinc-500 italic">No energy level logged for today. Navigate to dashboard to submit a mood check.</Text>
          )}
        </View>
      </ScrollView>

      {/* DETAILED DAILY METRIC MODAL */}
      <Modal
        visible={activeModalMetric !== null}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setActiveModalMetric(null)}
      >
        <SafeAreaView className="flex-1 bg-white dark:bg-black">
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-900">
            <Pressable
              onPress={() => setActiveModalMetric(null)}
              className="h-9 w-9 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-900 active:opacity-75"
            >
              <ChevronLeft size={20} color={isDark ? 'white' : '#1C1C1E'} />
            </Pressable>
            <Text className="text-[16px] font-bold text-zinc-800 dark:text-white uppercase tracking-wider">
              {activeModalMetric === 'steps'
                ? 'Step Count'
                : activeModalMetric === 'distance'
                ? 'Distance'
                : activeModalMetric === 'move'
                ? 'Activity Move'
                : 'Sleep'}
            </Text>
            <View className="w-9" />
          </View>

          <ScrollView className="flex-1 px-6 pt-4" contentContainerStyle={{ paddingBottom: 60 }}>
            {/* D / W / M / Y Tab Selector */}
            <View className="flex-row rounded-full bg-zinc-100 dark:bg-zinc-900 p-1 mb-8">
              {(['D', 'W', 'M', 'Y'] as const).map((tab) => (
                <Pressable
                  key={tab}
                  onPress={() => setModalTimeframe(tab)}
                  className={`flex-1 py-2 rounded-full items-center justify-center ${
                    modalTimeframe === tab ? 'bg-white dark:bg-zinc-800 shadow-sm' : ''
                  }`}
                >
                  <Text className={`text-xs font-bold ${modalTimeframe === tab ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 dark:text-zinc-500'}`}>
                    {tab}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Total / Stats summary */}
            <Text className="text-zinc-500 dark:text-zinc-500 text-[10px] font-bold uppercase tracking-[1.5px]">Total</Text>
            <View className="flex-row items-baseline mt-1.5 mb-8">
              {activeModalMetric === 'steps' && (
                <>
                  <Text className="text-4xl font-extrabold text-[#AF52DE] dark:text-[#C57BFA]">
                    {modalTimeframe === 'D' ? steps.toLocaleString() : (steps * 7).toLocaleString()}
                  </Text>
                  <Text className="text-sm font-bold text-zinc-500 dark:text-zinc-500 ml-1.5 uppercase">Steps</Text>
                </>
              )}
              {activeModalMetric === 'distance' && (
                <>
                  <Text className="text-4xl font-extrabold text-[#00B4D8] dark:text-[#00E5FF]">
                    {modalTimeframe === 'D' ? distanceMiles.toFixed(2) : (distanceMiles * 7).toFixed(2)}
                  </Text>
                  <Text className="text-sm font-bold text-zinc-500 dark:text-zinc-500 ml-1.5 uppercase">MI</Text>
                </>
              )}
              {activeModalMetric === 'move' && (
                <>
                  <Text className="text-4xl font-extrabold text-[#FF004F]">
                    {modalTimeframe === 'D' ? caloriesBurned : caloriesBurned * 7}
                  </Text>
                  <Text className="text-sm font-bold text-zinc-500 dark:text-zinc-500 ml-1.5 uppercase">CAL</Text>
                </>
              )}
              {activeModalMetric === 'sleep' && (
                <>
                  <Text className="text-4xl font-extrabold text-[#34C759] dark:text-[#30D158]">
                    {modalTimeframe === 'D' ? (
                      sleepData?.success && sleepData.totalSleepHours != null
                        ? `${Math.floor(sleepData.totalSleepHours)}h ${Math.round((sleepData.totalSleepHours % 1) * 60)}m`
                        : '--'
                    ) : (
                      weeklySleepData && weeklySleepData.length > 0
                        ? (() => {
                            const total = weeklySleepData.reduce((acc, curr) => acc + (curr.totalSleepHours || 0), 0);
                            const avg = total / weeklySleepData.length;
                            return `${Math.floor(avg)}h ${Math.round((avg % 1) * 60)}m avg`;
                          })()
                        : '--'
                    )}
                  </Text>
                  <Text className="text-sm font-bold text-zinc-500 dark:text-zinc-500 ml-1.5 uppercase">Sleep</Text>
                </>
              )}
            </View>

            {/* High-Resolution Grid Hourly Chart */}
            <View className="h-[240px] w-full border-t border-b border-zinc-200 dark:border-zinc-900 justify-between py-6">
              {/* Y Axis Guide labels */}
              <View className="absolute left-0 right-0 h-full justify-between pr-2 pointer-events-none">
                <Text className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600 text-right">
                  {activeModalMetric === 'steps' ? '2,000' : activeModalMetric === 'distance' ? '1.0 MI' : activeModalMetric === 'move' ? '80 CAL' : '8h'}
                </Text>
                <Text className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600 text-right">
                  {activeModalMetric === 'steps' ? '1,000' : activeModalMetric === 'distance' ? '0.5 MI' : activeModalMetric === 'move' ? '40 CAL' : '4h'}
                </Text>
                <Text className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600 text-right">0</Text>
              </View>

              {/* Grid Horizontal Guide lines */}
              <View className="absolute left-0 right-0 top-[24px] border-t border-zinc-200 dark:border-zinc-900 border-dashed" />
              <View className="absolute left-0 right-0 top-[120px] border-t border-zinc-200 dark:border-zinc-900 border-dashed" />

              <View className="flex-row items-end justify-between h-[160px] w-full px-2">
                {activeModalMetric === 'sleep' ? (
                  modalTimeframe === 'D' ? (
                    // Render sleep timeline from real data for 'D' timeframe
                    new Array(24).fill(0).map((_, index) => {
                      // Determine if this hour falls within the actual sleep window
                      let isSleepTime = false;
                      if (sleepData?.success && sleepData.sleepStartTime != null && sleepData.sleepEndTime != null) {
                        const startHour = new Date(sleepData.sleepStartTime).getHours();
                        const endHour = new Date(sleepData.sleepEndTime).getHours();
                        if (startHour > endHour) {
                          // Overnight sleep (e.g., 23 to 7)
                          isSleepTime = index >= startHour || index <= endHour;
                        } else {
                          isSleepTime = index >= startHour && index <= endHour;
                        }
                      } else {
                        isSleepTime = index >= 22 || index <= 5; // Fallback
                      }

                      // Check if this hour had a micro-awakening
                      const hasInterruption = sleepData?.interruptionTimes?.some(t => {
                        const h = new Date(t).getHours();
                        return h === index;
                      }) ?? false;

                      return (
                        <View key={index} className="flex-1 items-center h-full justify-end relative">
                          <View className="absolute bottom-0 w-[1px] h-full bg-zinc-100 dark:bg-zinc-900/50" />
                          {isSleepTime && (
                            <View className={`w-[6px] rounded-t-full z-10 ${hasInterruption ? 'h-[40px] bg-amber-500' : 'h-[90px] bg-emerald-500'}`} />
                          )}
                        </View>
                      );
                    })
                  ) : (
                    // Render 7-day trend chart
                    new Array(7).fill(0).map((_, index) => {
                      // Generate past 7 days (including today)
                      const d = new Date();
                      d.setDate(d.getDate() - (6 - index));
                      const dateStr = d.toISOString().split('T')[0];
                      
                      const record = weeklySleepData?.find(r => r.sleepDate === dateStr);
                      const hours = record?.totalSleepHours || 0;
                      const target = profile?.sleepTarget ?? 8;
                      const ratio = Math.min(hours / target, 1.2); // max 120% height
                      
                      // Calculate height (max 140px)
                      const height = Math.max(ratio * 140, 4); // min 4px if no data
                      
                      // Color based on target completion
                      let colorClass = 'bg-zinc-200 dark:bg-zinc-800'; // no data
                      if (hours > 0) {
                        if (hours >= target * 0.875) colorClass = 'bg-emerald-500';
                        else if (hours >= target * 0.625) colorClass = 'bg-amber-500';
                        else colorClass = 'bg-red-500';
                      }

                      return (
                        <View key={index} className="flex-1 items-center h-full justify-end relative">
                          {/* Target line indicator if requested, could be overlaid */}
                          <View className={`w-[20px] rounded-t-lg z-10 ${colorClass}`} style={{ height }} />
                        </View>
                      );
                    })
                  )
                ) : (
                  // Render active steps/distance/move bars
                  hourlySteps.map((val, index) => {
                    const maxPeak = Math.max(...hourlySteps, 300);
                    const heightPercent = val > 0 ? Math.max((val / maxPeak) * 100, 12) : 0;
                    const barColor =
                      activeModalMetric === 'steps'
                        ? 'bg-[#AF52DE] dark:bg-[#C57BFA]'
                        : activeModalMetric === 'distance'
                        ? 'bg-[#00B4D8] dark:bg-[#00E5FF]'
                        : 'bg-[#FF004F]';

                    return (
                      <View key={index} className="flex-1 items-center h-full justify-end relative">
                        {/* Vertical grid line */}
                        <View className="absolute bottom-0 w-[1px] h-full bg-zinc-100 dark:bg-zinc-900/50" />
                        {/* Active bar */}
                        {heightPercent > 0 && (
                          <View
                            style={{ height: `${heightPercent}%` }}
                            className={`w-[6px] rounded-t-full ${barColor} z-10`}
                          />
                        )}
                      </View>
                    );
                  })
                )}
              </View>

              {/* X-axis labels */}
              <View className={`flex-row justify-between w-full px-2 mt-4 ${activeModalMetric === 'sleep' && modalTimeframe === 'W' ? 'pr-4 pl-4' : ''}`}>
                {activeModalMetric === 'sleep' && modalTimeframe === 'W' ? (
                  new Array(7).fill(0).map((_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - (6 - i));
                    const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);
                    return (
                      <Text key={i} className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600">
                        {dayStr}
                      </Text>
                    );
                  })
                ) : (
                  <>
                    <Text className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600">12 AM</Text>
                    <Text className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600">6 AM</Text>
                    <Text className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600">12 PM</Text>
                    <Text className="text-[10px] font-bold text-zinc-400 dark:text-zinc-600">6 PM</Text>
                  </>
                )}
              </View>
            </View>

            {/* Apple style info banner */}
            <View className="flex-row bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-4.5 mt-8 items-start gap-3">
              <Info size={16} color="#007AFF" className="mt-0.5" />
              <View className="flex-1">
                {activeModalMetric === 'sleep' ? (
                  <>
                    <Text className="text-xs font-bold text-zinc-900 dark:text-white">About Passive Sleep Tracking</Text>
                    <Text className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-[15px]">
                      Sleep is inferred passively using your phone's ambient light sensor, proximity sensor, and screen state. No wearable needed. Brief wake-ups under 20 minutes are automatically bridged into a single sleep session.
                    </Text>
                  </>
                ) : (
                  <>
                    <Text className="text-xs font-bold text-zinc-900 dark:text-white">About Stride Length & Distance</Text>
                    <Text className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-[15px]">
                      Step Distance is calculated using the formula Stride Length = Height * 0.413. Height is fetched dynamically from your Zeno profile. If no height is set, an average height of 170cm is used.
                    </Text>
                  </>
                )}
              </View>
            </View>

            {/* Neon lime Apple fitness style button */}
            <Pressable
              onPress={() => {
                Alert.alert('Metrics detail sync', 'All data is synchronized with your Zeno hardware accelerometer sensors.');
              }}
              className="mt-8 py-4.5 rounded-full bg-[#007AFF]/10 dark:bg-[#007AFF]/25 items-center justify-center active:opacity-75"
            >
              <Text className="text-sm font-bold text-[#007AFF] tracking-[0.5px]">View All Steps Metrics</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

export default HealthScreen;
