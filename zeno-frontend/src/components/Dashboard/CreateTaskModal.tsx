import React, { useState, useCallback } from 'react';
import { Modal, View, Text, Pressable, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Switch, ScrollView } from 'react-native';
import { X, AlertCircle, Calendar, Zap, Flag } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { dashboardApi } from '../../api/dashboardApi';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

interface CreateTaskModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSave?: () => void;
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ isVisible, onClose, onSave }) => {
  const { isDark } = useTheme();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [effortLevel, setEffortLevel] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [isCritical, setIsCritical] = useState(false);
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [dateObj, setDateObj] = useState(new Date());

  const [startTimeDate, setStartTimeDate] = useState('');
  const [startTimeTime, setStartTimeTime] = useState('');
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [startDateObj, setStartDateObj] = useState(new Date());

  const [estimatedTimeStr, setEstimatedTimeStr] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = useCallback(() => {
    setTitle('');
    setDescription('');
    setEffortLevel('Medium');
    setIsCritical(false);
    setDeadlineDate('');
    setDeadlineTime('');
    setStartTimeDate('');
    setStartTimeTime('');
    setEstimatedTimeStr('');
    setError(null);
    onClose();
  }, [onClose]);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Please enter a task title');
      return;
    }

    setIsSaving(true);
    setError(null);
    
    try {
      let deadlineStr: string | null = null;
      const d = deadlineDate.trim();
      const t = deadlineTime.trim();
      if (d && t) {
        deadlineStr = `${d}T${t}:00`;
      } else if (d) {
        deadlineStr = `${d}T00:00:00`;
      }

      let startTimeStr: string | null = null;
      const sd = startTimeDate.trim();
      const st = startTimeTime.trim();
      if (sd && st) {
        startTimeStr = `${sd}T${st}:00`;
      } else if (sd) {
        startTimeStr = `${sd}T00:00:00`;
      }

      let estimatedTime: number | null = null;
      if (estimatedTimeStr.trim()) {
        const parsed = parseInt(estimatedTimeStr, 10);
        if (!isNaN(parsed)) {
          estimatedTime = parsed;
        }
      }

      const response = await dashboardApi.createManualTask({
        title: title.trim(),
        description: description.trim() || undefined,
        effortLevel,
        isCritical,
        status: 'PENDING',
        deadline: deadlineStr,
        startTime: startTimeStr,
        estimatedTime,
      });

      if (response.success) {
        if (onSave) onSave();
        handleClose();
      } else {
        setError(response.message || 'Failed to create task.');
      }
    } catch (err: any) {
      console.error('[CreateTaskModal] save error:', err);
      setError(err.message || 'An error occurred while creating the task.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const effortConfig = {
    Low: { emoji: '🍃', color: '#34C759', bgLight: 'bg-green-50', bgDark: 'dark:bg-green-950/20' },
    Medium: { emoji: '⚡', color: '#FF9500', bgLight: 'bg-orange-50', bgDark: 'dark:bg-orange-950/20' },
    High: { emoji: '🔥', color: '#FF3B30', bgLight: 'bg-red-50', bgDark: 'dark:bg-red-950/20' },
  };

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
          <View className="items-center pt-2 pb-1">
            <View className="h-[5px] w-9 rounded-full bg-zinc-300 dark:bg-zinc-600" />
          </View>

          {/* Header — iOS style */}
          <View className="flex-row items-center justify-between px-5 pb-3 pt-2">
            <Pressable onPress={handleClose} hitSlop={12}>
              <Text className="text-[17px] text-[#007AFF]">Cancel</Text>
            </Pressable>
            <Text className="text-[17px] font-semibold text-black dark:text-white">New Task</Text>
            <Pressable onPress={handleSave} disabled={isSaving} hitSlop={12}>
              {isSaving ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <Text className={`text-[17px] font-semibold ${title.trim() ? 'text-[#007AFF]' : 'text-zinc-300 dark:text-zinc-600'}`}>
                  Add
                </Text>
              )}
            </Pressable>
          </View>

          {/* Separator */}
          <View className="h-[0.5px] bg-zinc-200 dark:bg-zinc-700" />

          {/* Error */}
          {error && (
            <View className="mx-5 mt-3 flex-row items-center gap-2 rounded-xl bg-red-50 p-3 dark:bg-red-900/20">
              <AlertCircle size={15} color="#FF3B30" />
              <Text className="flex-1 text-[13px] font-medium text-red-600 dark:text-red-400">{error}</Text>
            </View>
          )}

          <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            
            {/* ─── Title & Description Card ─── */}
            <View className="mx-5 mt-5">
              <View className="rounded-3xl bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <TextInput
                  value={title}
                  onChangeText={(t) => { setTitle(t); if (error) setError(null); }}
                  placeholder="Title"
                  placeholderTextColor={isDark ? '#636366' : '#C7C7CC'}
                  className="px-4 pt-3.5 pb-3 text-[17px] text-black dark:text-white font-medium"
                  autoFocus
                />
                <View className="h-[0.5px] mx-4 bg-zinc-100 dark:bg-zinc-700" />
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Notes"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  placeholderTextColor={isDark ? '#636366' : '#C7C7CC'}
                  className="px-4 pt-3 pb-4 text-[15px] text-zinc-700 dark:text-zinc-300 min-h-[80px]"
                />
              </View>
            </View>

            {/* ─── Effort Level ─── */}
            <View className="mx-5 mt-6">
              <Text className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400 mb-2 ml-1">
                Effort Level
              </Text>
              <View className="rounded-3xl bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 p-1.5 flex-row gap-1.5">
                {(['Low', 'Medium', 'High'] as const).map(level => {
                  const config = effortConfig[level];
                  const selected = effortLevel === level;
                  return (
                    <Pressable
                      key={level}
                      onPress={() => setEffortLevel(level)}
                      className={[
                        'flex-1 items-center rounded-lg py-2.5',
                        selected ? `${config.bgLight} ${config.bgDark}` : '',
                      ].join(' ')}
                    >
                      <Text className="text-base mb-0.5">{config.emoji}</Text>
                      <Text 
                        className={`text-[13px] font-semibold ${selected ? 'text-black dark:text-white' : 'text-zinc-400 dark:text-zinc-500'}`}
                      >
                        {level}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* ─── Deadline ─── */}
            <View className="mx-5 mt-6">
              <Text className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400 mb-2 ml-1">
                Deadline
              </Text>
              <View className="rounded-3xl bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <Pressable
                  onPress={() => setShowDatePicker(true)}
                  className="flex-row items-center px-4 py-3.5"
                >
                  <Calendar size={18} color={isDark ? '#8E8E93' : '#8E8E93'} />
                  <Text className="ml-3 flex-1 text-[16px] text-black dark:text-white">Date</Text>
                  <Text className={`text-[16px] ${deadlineDate ? 'text-[#007AFF]' : 'text-zinc-300 dark:text-zinc-600'}`}>
                    {deadlineDate ? formatDisplayDate(deadlineDate) : 'None'}
                  </Text>
                </Pressable>
                <View className="h-[0.5px] ml-[52px] bg-zinc-100 dark:bg-zinc-700" />
                <Pressable
                  onPress={() => setShowTimePicker(true)}
                  className="flex-row items-center px-4 py-3.5"
                >
                  <Zap size={18} color={isDark ? '#8E8E93' : '#8E8E93'} />
                  <Text className="ml-3 flex-1 text-[16px] text-black dark:text-white">Time</Text>
                  <Text className={`text-[16px] ${deadlineTime ? 'text-[#007AFF]' : 'text-zinc-300 dark:text-zinc-600'}`}>
                    {deadlineTime || 'None'}
                  </Text>
                </Pressable>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={dateObj}
                  mode="date"
                  display="default"
                  onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                    setShowDatePicker(false);
                    if (selectedDate) {
                      setDateObj(selectedDate);
                      setDeadlineDate(selectedDate.toISOString().split('T')[0]);
                    }
                  }}
                />
              )}
              {showTimePicker && (
                <DateTimePicker
                  value={dateObj}
                  mode="time"
                  display="default"
                  onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                    setShowTimePicker(false);
                    if (selectedDate) {
                      setDateObj(selectedDate);
                      setDeadlineTime(selectedDate.toISOString().split('T')[1].substring(0, 5));
                    }
                  }}
                />
              )}
            </View>

            {/* ─── Start Time ─── */}
            <View className="mx-5 mt-6">
              <Text className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400 mb-2 ml-1">
                Start Time
              </Text>
              <View className="rounded-3xl bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <Pressable
                  onPress={() => setShowStartDatePicker(true)}
                  className="flex-row items-center px-4 py-3.5"
                >
                  <Calendar size={18} color={isDark ? '#8E8E93' : '#8E8E93'} />
                  <Text className="ml-3 flex-1 text-[16px] text-black dark:text-white">Date</Text>
                  <Text className={`text-[16px] ${startTimeDate ? 'text-[#007AFF]' : 'text-zinc-300 dark:text-zinc-600'}`}>
                    {startTimeDate ? formatDisplayDate(startTimeDate) : 'None'}
                  </Text>
                </Pressable>
                <View className="h-[0.5px] ml-[52px] bg-zinc-100 dark:bg-zinc-700" />
                <Pressable
                  onPress={() => setShowStartTimePicker(true)}
                  className="flex-row items-center px-4 py-3.5"
                >
                  <Zap size={18} color={isDark ? '#8E8E93' : '#8E8E93'} />
                  <Text className="ml-3 flex-1 text-[16px] text-black dark:text-white">Time</Text>
                  <Text className={`text-[16px] ${startTimeTime ? 'text-[#007AFF]' : 'text-zinc-300 dark:text-zinc-600'}`}>
                    {startTimeTime || 'None'}
                  </Text>
                </Pressable>
              </View>

              {showStartDatePicker && (
                <DateTimePicker
                  value={startDateObj}
                  mode="date"
                  display="default"
                  onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                    setShowStartDatePicker(false);
                    if (selectedDate) {
                      setStartDateObj(selectedDate);
                      setStartTimeDate(selectedDate.toISOString().split('T')[0]);
                    }
                  }}
                />
              )}
              {showStartTimePicker && (
                <DateTimePicker
                  value={startDateObj}
                  mode="time"
                  display="default"
                  onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                    setShowStartTimePicker(false);
                    if (selectedDate) {
                      setStartDateObj(selectedDate);
                      setStartTimeTime(selectedDate.toISOString().split('T')[1].substring(0, 5));
                    }
                  }}
                />
              )}
            </View>

            {/* ─── Estimated Time ─── */}
            <View className="mx-5 mt-6">
              <Text className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400 mb-2 ml-1">
                Estimated Time (mins)
              </Text>
              <View className="rounded-3xl bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <TextInput
                  value={estimatedTimeStr}
                  onChangeText={setEstimatedTimeStr}
                  placeholder="e.g. 30"
                  keyboardType="numeric"
                  placeholderTextColor={isDark ? '#636366' : '#C7C7CC'}
                  className="px-4 py-3.5 text-[17px] text-black dark:text-white font-medium"
                />
              </View>
            </View>

            {/* ─── Priority Toggle ─── */}
            <View className="mx-5 mt-6">
              <View className="rounded-3xl bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 px-4 py-3.5 flex-row items-center">
                <View className="h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 mr-3">
                  <Flag size={16} color="#FF3B30" />
                </View>
                <View className="flex-1">
                  <Text className="text-[16px] font-medium text-black dark:text-white">Critical Priority</Text>
                  <Text className="text-[12px] text-zinc-400 dark:text-zinc-500 mt-0.5">Flagged as urgent</Text>
                </View>
                <Switch
                  value={isCritical}
                  onValueChange={setIsCritical}
                  trackColor={{ false: isDark ? '#39393D' : '#E9E9EB', true: '#FF3B30' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default CreateTaskModal;
