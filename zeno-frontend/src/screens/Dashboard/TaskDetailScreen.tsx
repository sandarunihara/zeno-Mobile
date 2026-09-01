import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View, Pressable, TextInput, Switch, Alert, Modal, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ArrowLeft, Clock, AlertTriangle, CheckCircle2, Edit3, Save, X, Flag, ChevronRight, Trash2 } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { dashboardApi, Task, TaskDetailResponse, ManualTaskRequest } from '../../api/dashboardApi';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

const TaskDetailScreen: React.FC = () => {
  const { theme, isDark } = useTheme();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { taskId } = route.params;

  const [loading, setLoading] = useState(true);
  const [taskDetail, setTaskDetail] = useState<TaskDetailResponse | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [dateObj, setDateObj] = useState(new Date());

  const [startTimeDate, setStartTimeDate] = useState('');
  const [startTimeTime, setStartTimeTime] = useState('');
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [startDateObj, setStartDateObj] = useState(new Date());

  const [estimatedTimeStr, setEstimatedTimeStr] = useState('');

  const [editForm, setEditForm] = useState<ManualTaskRequest>({
    title: '',
    description: '',
    effortLevel: 'Medium',
    deadline: '',
    isCritical: false,
    status: 'PENDING'
  });

  type AlertConfig = {
    visible: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  };

  const [customAlert, setCustomAlert] = useState<AlertConfig>({
    visible: false,
    title: '',
    message: '',
    confirmText: '',
    cancelText: 'Cancel',
    onConfirm: () => {}
  });

  const closeAlert = () => setCustomAlert(prev => ({ ...prev, visible: false }));

  const fetchDetail = async () => {
    try {
      const response = await dashboardApi.getTaskById(taskId);
      setTaskDetail(response);
      if (response.task) {
        let defaultDate = '';
        let defaultTime = '';
        if (response.task.deadline) {
          try {
            const parts = response.task.deadline.split('T');
            if (parts.length === 2) {
              defaultDate = parts[0];
              defaultTime = parts[1].substring(0, 5); 
            } else {
              defaultDate = response.task.deadline;
            }
          } catch(e) {}
        }
        
        setEditDate(defaultDate);
        setEditTime(defaultTime);
        let dObj = new Date();
        if (defaultDate) {
          const t = defaultTime || '00:00';
          const parsed = new Date(`${defaultDate}T${t}:00`);
          if (!isNaN(parsed.getTime())) {
            dObj = parsed;
          }
        }
        setDateObj(dObj);

        let defaultStartDate = '';
        let defaultStartTime = '';
        if (response.task.startTime) {
          try {
            const parts = response.task.startTime.split('T');
            if (parts.length === 2) {
              defaultStartDate = parts[0];
              defaultStartTime = parts[1].substring(0, 5); 
            } else {
              defaultStartDate = response.task.startTime;
            }
          } catch(e) {}
        }
        
        setStartTimeDate(defaultStartDate);
        setStartTimeTime(defaultStartTime);
        let sdObj = new Date();
        if (defaultStartDate) {
          const t = defaultStartTime || '00:00';
          const parsed = new Date(`${defaultStartDate}T${t}:00`);
          if (!isNaN(parsed.getTime())) {
            sdObj = parsed;
          }
        }
        setStartDateObj(sdObj);

        setEstimatedTimeStr(response.task.estimatedTime ? response.task.estimatedTime.toString() : '');

        setEditForm({
          title: response.task.title,
          description: response.task.description || '',
          effortLevel: response.task.effort_level,
          deadline: response.task.deadline || '',
          startTime: response.task.startTime || '',
          estimatedTime: response.task.estimatedTime || null,
          isCritical: response.task.is_critical,
          status: response.task.status
        });
      }
    } catch (error) {
      console.error("Failed to fetch task detail", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [taskId]);

  const handleSaveWithConfirmation = () => {
    setCustomAlert({
      visible: true,
      title: 'Save Changes',
      message: 'Are you sure you want to save these changes?',
      confirmText: 'Save',
      cancelText: 'Cancel',
      isDestructive: false,
      onConfirm: handleSave,
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = { ...editForm };
      
      const d = editDate.trim();
      const t = editTime.trim();

      if (d && t) {
        payload.deadline = `${d}T${t}:00`;
      } else if (d) {
        payload.deadline = `${d}T00:00:00`;
      } else {
        payload.deadline = null;
      }
      
      const sd = startTimeDate.trim();
      const st = startTimeTime.trim();
      if (sd && st) {
        payload.startTime = `${sd}T${st}:00`;
      } else if (sd) {
        payload.startTime = `${sd}T00:00:00`;
      } else {
        payload.startTime = null;
      }

      let estTime: number | null = null;
      if (estimatedTimeStr.trim()) {
        const parsed = parseInt(estimatedTimeStr, 10);
        if (!isNaN(parsed)) {
          estTime = parsed;
        }
      }
      payload.estimatedTime = estTime;
      
      const response = await dashboardApi.updateTask(taskId, payload);
      if (response.success) {
        setIsEditing(false);
        await fetchDetail();
      } else {
        console.error("Failed to update task:", response.message);
        Alert.alert("Error", `Failed to update task: ${response.message}`);
      }
    } catch (error) {
      console.error("Failed to update task", error);
    } finally {
      setSaving(false);
    }
  };

  const handleQuickCompleteWithConfirmation = () => {
    setCustomAlert({
      visible: true,
      title: 'Complete Task',
      message: 'Are you sure you want to mark this task as done?',
      confirmText: 'Complete',
      cancelText: 'Cancel',
      isDestructive: false,
      onConfirm: handleQuickComplete,
    });
  };

  const handleQuickComplete = async () => {
    try {
      setSaving(true);
      const response = await dashboardApi.completeTask(taskId);
      if (response.success) {
        await fetchDetail();
      } else {
        Alert.alert("Error", `Failed to complete task: ${response.message}`);
      }
    } catch (error) {
      console.error("Failed to complete task", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWithConfirmation = () => {
    setCustomAlert({
      visible: true,
      title: 'Delete Task',
      message: 'Are you sure you want to delete this task? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      isDestructive: true,
      onConfirm: handleDelete,
    });
  };

  const handleDelete = async () => {
    try {
      setSaving(true);
      const response = await dashboardApi.deleteTask(taskId);
      if (response.success) {
        navigation.goBack();
      } else {
        Alert.alert("Error", `Failed to delete task: ${response.message}`);
      }
    } catch (error) {
      console.error("Failed to delete task", error);
    } finally {
      setSaving(false);
    }
  };

  const isUrgent = (deadline?: string | null) => {
    if (!deadline) return false;
    const diff = new Date(deadline).getTime() - new Date().getTime();
    return diff > 0 && diff <= 48 * 60 * 60 * 1000;
  };

  const formatDeadline = (deadline?: string | null) => {
    if (!deadline) return 'No Deadline';
    const d = new Date(deadline);
    if (isNaN(d.getTime())) return deadline;
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = d.toDateString() === tomorrow.toDateString();
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isToday) return `Today at ${time}`;
    if (isTomorrow) return `Tomorrow at ${time}`;
    return `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()} at ${time}`;
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const effortConfig: Record<string, { emoji: string; color: string; label: string }> = {
    Low: { emoji: '🍃', color: '#34C759', label: 'Low Effort' },
    Medium: { emoji: '⚡', color: '#FF9500', label: 'Medium Effort' },
    High: { emoji: '🔥', color: '#FF3B30', label: 'High Effort' },
  };

  // ─── Loading State ─────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-black">
        <View className="flex-row items-center px-5 pt-2 pb-2">
          <Pressable onPress={() => navigation.goBack()} className="p-1.5 -ml-1.5 rounded-full" hitSlop={8}>
            <ArrowLeft size={24} color="#007AFF" />
          </Pressable>
        </View>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  // ─── Not Found ─────────────────────────────────────────────────
  if (!taskDetail || !taskDetail.task) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-black">
        <View className="flex-row items-center px-5 pt-2 pb-2">
          <Pressable onPress={() => navigation.goBack()} className="p-1.5 -ml-1.5 rounded-full" hitSlop={8}>
            <ArrowLeft size={24} color="#007AFF" />
          </Pressable>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-4xl mb-4">🔍</Text>
          <Text className="text-[17px] font-semibold text-black dark:text-white">Task Not Found</Text>
          <Text className="text-[14px] text-zinc-400 dark:text-zinc-500 mt-1 text-center">
            This task may have been deleted or moved.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const { task, microSteps, parentTask } = taskDetail;
  const urgent = isUrgent(task.deadline);
  const isCompleted = task.status === 'COMPLETED';
  const effort = effortConfig[task.effort_level] ?? effortConfig.Medium;

  const renderCustomAlert = () => (
    <Modal
      transparent
      visible={customAlert.visible}
      animationType="fade"
      onRequestClose={closeAlert}
    >
      <View className="flex-1 items-center justify-center bg-black/40 px-12">
        <View className="w-full rounded-3xl bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 overflow-hidden"
        >
          <View className="px-4 pt-5 pb-4 items-center">
            <Text className="text-[17px] font-semibold text-black dark:text-white text-center">
              {customAlert.title}
            </Text>
            <Text className="mt-1 text-[13px] leading-4 text-black dark:text-white text-center">
              {customAlert.message}
            </Text>
          </View>

          <View className="flex-row border-t border-zinc-200 dark:border-zinc-800">
            <Pressable
              onPress={closeAlert}
              className="flex-1 py-3 items-center border-r border-zinc-200 dark:border-zinc-800 active:bg-zinc-50 dark:active:bg-zinc-900"
            >
              <Text className="text-[17px] text-[#007AFF] font-normal">{customAlert.cancelText}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                closeAlert();
                customAlert.onConfirm();
              }}
              className="flex-1 py-3 items-center active:bg-zinc-50 dark:active:bg-zinc-900"
            >
              <Text className={['text-[17px] font-semibold', customAlert.isDestructive ? 'text-[#FF3B30]' : 'text-[#007AFF]'].join(' ')}>
                {customAlert.confirmText}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );

  // ─── EDIT MODE ─────────────────────────────────────────────────
  if (isEditing) {
    return (
      <SafeAreaView className="flex-1 bg-white dark:bg-black" edges={['top', 'left', 'right']}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pt-2 pb-3">
          <Pressable onPress={() => setIsEditing(false)} hitSlop={12}>
            <Text className="text-[17px] text-[#007AFF]">Cancel</Text>
          </Pressable>
          <Text className="text-[17px] font-semibold text-black dark:text-white">Edit Task</Text>
          <Pressable onPress={handleSaveWithConfirmation} disabled={saving} hitSlop={12}>
            {saving ? (
              <ActivityIndicator size="small" color="#007AFF" />
            ) : (
              <Text className="text-[17px] font-semibold text-[#007AFF]">Save</Text>
            )}
          </Pressable>
        </View>
        <View className="h-[0.5px] bg-zinc-200 dark:bg-zinc-800" />

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          
          {/* Title & Description */}
          <View className="mx-5 mt-5">
            <View className="rounded-3xl bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 overflow-hidden"
            >
              <TextInput
                value={editForm.title}
                onChangeText={(t) => setEditForm({ ...editForm, title: t })}
                placeholder="Title"
                placeholderTextColor={isDark ? '#636366' : '#C7C7CC'}
                className="px-4 pt-3.5 pb-3 text-[17px] text-black dark:text-white font-medium"
              />
              <View className="h-[0.5px] mx-4 bg-zinc-100 dark:bg-zinc-700" />
              <TextInput
                value={editForm.description}
                onChangeText={(t) => setEditForm({ ...editForm, description: t })}
                placeholder="Notes"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholderTextColor={isDark ? '#636366' : '#C7C7CC'}
                className="px-4 pt-3 pb-4 text-[15px] text-zinc-700 dark:text-zinc-300 min-h-[100px]"
              />
            </View>
          </View>

          {/* Deadline */}
          <View className="mx-5 mt-6">
            <Text className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400 mb-2 ml-1">
              Deadline
            </Text>
            <View className="rounded-3xl bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 overflow-hidden"
            >
              <Pressable
                onPress={() => setShowDatePicker(true)}
                className="flex-row items-center px-4 py-3.5"
              >
                <Text className="flex-1 text-[16px] text-black dark:text-white">Date</Text>
                <Text className={`text-[16px] ${editDate ? 'text-[#007AFF]' : 'text-zinc-300 dark:text-zinc-600'}`}>
                  {editDate ? formatDisplayDate(editDate) : 'None'}
                </Text>
              </Pressable>
              <View className="h-[0.5px] ml-4 bg-zinc-100 dark:bg-zinc-700" />
              <Pressable
                onPress={() => setShowTimePicker(true)}
                className="flex-row items-center px-4 py-3.5"
              >
                <Text className="flex-1 text-[16px] text-black dark:text-white">Time</Text>
                <Text className={`text-[16px] ${editTime ? 'text-[#007AFF]' : 'text-zinc-300 dark:text-zinc-600'}`}>
                  {editTime || 'None'}
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
                    setEditDate(selectedDate.toISOString().split('T')[0]);
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
                    setEditTime(selectedDate.toISOString().split('T')[1].substring(0, 5));
                  }
                }}
              />
            )}
          </View>

          {/* Start Time */}
          <View className="mx-5 mt-6">
            <Text className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400 mb-2 ml-1">
              Start Time
            </Text>
            <View className="rounded-3xl bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 overflow-hidden"
            >
              <Pressable
                onPress={() => setShowStartDatePicker(true)}
                className="flex-row items-center px-4 py-3.5"
              >
                <Text className="flex-1 text-[16px] text-black dark:text-white">Date</Text>
                <Text className={`text-[16px] ${startTimeDate ? 'text-[#007AFF]' : 'text-zinc-300 dark:text-zinc-600'}`}>
                  {startTimeDate ? formatDisplayDate(startTimeDate) : 'None'}
                </Text>
              </Pressable>
              <View className="h-[0.5px] ml-4 bg-zinc-100 dark:bg-zinc-700" />
              <Pressable
                onPress={() => setShowStartTimePicker(true)}
                className="flex-row items-center px-4 py-3.5"
              >
                <Text className="flex-1 text-[16px] text-black dark:text-white">Time</Text>
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

          {/* Estimated Time */}
          <View className="mx-5 mt-6">
            <Text className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400 mb-2 ml-1">
              Estimated Time (mins)
            </Text>
            <View className="rounded-3xl bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 overflow-hidden"
            >
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

          {/* Effort Level */}
          <View className="mx-5 mt-6">
            <Text className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400 mb-2 ml-1">
              Effort Level
            </Text>
            <View className="rounded-3xl bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 p-1.5 flex-row gap-1.5"
            >
              {(['Low', 'Medium', 'High'] as const).map(level => {
                const config = effortConfig[level];
                const selected = editForm.effortLevel === level;
                return (
                  <Pressable
                    key={level}
                    onPress={() => setEditForm({ ...editForm, effortLevel: level })}
                    className={[
                      'flex-1 items-center rounded-lg py-2.5',
                      selected ? 'bg-zinc-100 dark:bg-zinc-800' : '',
                    ].join(' ')}
                  >
                    <Text className="text-base mb-0.5">{config.emoji}</Text>
                    <Text className={`text-[13px] font-semibold ${selected ? 'text-zinc-800 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-500'}`}>
                      {level}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Critical Toggle */}
          <View className="mx-5 mt-6">
            <View className="rounded-3xl bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 px-4 py-3.5 flex-row items-center"
            >
              <View className="h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 mr-3">
                <Flag size={16} color="#FF3B30" />
              </View>
              <View className="flex-1">
                <Text className="text-[16px] font-medium text-black dark:text-white">Critical Priority</Text>
              </View>
              <Switch
                value={editForm.isCritical}
                onValueChange={(v) => setEditForm({ ...editForm, isCritical: v })}
                trackColor={{ false: isDark ? '#39393D' : '#E9E9EB', true: '#FF3B30' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {/* Delete Button */}
          <View className="mx-5 mt-8">
            <Pressable
              onPress={handleDeleteWithConfirmation}
              className="rounded-3xl bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 px-4 py-3.5 flex-row items-center justify-center active:bg-red-50 dark:active:bg-red-900/20"
            >
              <Text className="text-[17px] font-medium text-[#FF3B30]">Delete Task</Text>
            </Pressable>
          </View>

        </ScrollView>
        {renderCustomAlert()}
      </SafeAreaView>
    );
  }

  // ─── VIEW MODE ─────────────────────────────────────────────────
  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black" edges={['top', 'left', 'right']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-2 pb-3">
        <Pressable
          onPress={() => navigation.goBack()}
          className="p-1.5 -ml-1.5 rounded-full active:opacity-60"
          hitSlop={8}
        >
          <ArrowLeft size={24} color="#007AFF" />
        </Pressable>

        <View className="flex-row items-center gap-3">
          {!isCompleted && (
            <Pressable
              onPress={handleQuickCompleteWithConfirmation}
              disabled={saving}
              className="flex-row items-center gap-1.5 rounded-full bg-[#34C759]/10 px-3.5 py-2 active:opacity-70"
            >
              {saving ? (
                <ActivityIndicator size="small" color="#34C759" />
              ) : (
                <>
                  <CheckCircle2 size={15} color="#34C759" strokeWidth={2.2} />
                  <Text className="text-[14px] font-semibold text-[#34C759]">Done</Text>
                </>
              )}
            </Pressable>
          )}
          {!task.isFromCalender && (
            <Pressable
              onPress={() => setIsEditing(true)}
              className="p-2 rounded-full active:opacity-60"
              hitSlop={8}
            >
              <Edit3 size={20} color="#007AFF" />
            </Pressable>
          )}
          <Pressable
            onPress={handleDeleteWithConfirmation}
            className="p-2 rounded-full active:opacity-60"
            hitSlop={8}
          >
            <Trash2 size={20} color="#FF3B30" />
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* Parent breadcrumb */}
        {parentTask && (
          <Pressable
            onPress={() => navigation.navigate('TaskDetail', { taskId: parentTask.id })}
            className="mx-5 mb-3 flex-row items-center self-start"
          >
            <Text className="text-[13px] font-medium text-[#007AFF]">
              ← {parentTask.title}
            </Text>
          </Pressable>
        )}

        {/* Hero Card */}
        <View className="mx-5 rounded-3xl bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 overflow-hidden"
        >
          {/* Status Banner */}
          {isCompleted && (
            <View className="bg-[#34C759]/10 px-5 py-2.5 flex-row items-center gap-2">
              <CheckCircle2 size={15} color="#34C759" />
              <Text className="text-[13px] font-semibold text-[#34C759]">Completed</Text>
            </View>
          )}

          <View className="px-5 pt-5 pb-5">
            {/* Badges Row */}
            <View className="flex-row items-center gap-2 mb-3 flex-wrap">
              {/* Effort */}
              <View className="flex-row items-center gap-1 rounded-full border border-zinc-200 dark:border-zinc-800 px-2.5 py-1">
                <Text className="text-[12px]">{effort.emoji}</Text>
                <Text className="text-[12px] font-semibold text-zinc-600 dark:text-zinc-400">{effort.label}</Text>
              </View>

              {/* Status if not completed */}
              {!isCompleted && (
                <View className="rounded-full bg-orange-50 dark:bg-orange-950/20 px-2.5 py-1">
                  <Text className="text-[12px] font-semibold text-orange-600 dark:text-orange-400">
                    {task.status}
                  </Text>
                </View>
              )}

              {/* Critical */}
              {task.is_critical && (
                <View className="flex-row items-center gap-1 rounded-full bg-red-50 dark:bg-red-950/20 px-2.5 py-1">
                  <Flag size={10} color="#FF3B30" fill="#FF3B30" />
                  <Text className="text-[12px] font-semibold text-red-600 dark:text-red-400">Critical</Text>
                </View>
              )}
            </View>

            {/* Title */}
            <Text className={`text-[24px] font-bold leading-8 mb-3 ${isCompleted ? 'text-zinc-400 dark:text-zinc-600' : 'text-black dark:text-white'}`}>
              {task.title}
            </Text>

            {/* Deadline */}
            <View className="flex-row items-center gap-2 mb-1.5">
              {urgent ? (
                <AlertTriangle size={14} color="#FF3B30" strokeWidth={2.2} />
              ) : (
                <Clock size={14} color={isDark ? '#8E8E93' : '#8E8E93'} strokeWidth={2.2} />
              )}
              <Text className={`text-[14px] font-medium ${urgent ? 'text-red-500' : 'text-zinc-400 dark:text-zinc-500'}`}>
                Deadline: {formatDeadline(task.deadline)}
              </Text>
            </View>

            {/* Start Time */}
            {task.startTime && (
              <View className="flex-row items-center gap-2 mb-1.5">
                <Clock size={14} color={isDark ? '#8E8E93' : '#8E8E93'} strokeWidth={2.2} />
                <Text className="text-[14px] font-medium text-zinc-400 dark:text-zinc-500">
                  Starts: {formatDeadline(task.startTime)}
                </Text>
              </View>
            )}

            {/* Estimated Time */}
            {task.estimatedTime != null && (
              <View className="flex-row items-center gap-2">
                <Clock size={14} color={isDark ? '#8E8E93' : '#8E8E93'} strokeWidth={2.2} />
                <Text className="text-[14px] font-medium text-zinc-400 dark:text-zinc-500">
                  Est. Duration: {task.estimatedTime} mins
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Description */}
        {task.description && (
          <View className="mx-5 mt-4">
            <Text className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400 mb-2 ml-1">
              Notes
            </Text>
            <View className="rounded-3xl bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 px-4 py-4">
              {(() => {
                const desc = task.description;
                const marker = "Meeting Link:";
                const idx = desc.indexOf(marker);
                if (idx === -1) {
                  return (
                    <Text className="text-[15px] leading-6 text-zinc-700 dark:text-zinc-300">
                      {desc}
                    </Text>
                  );
                }
                
                const textPart = desc.substring(0, idx).trim();
                const linkPart = desc.substring(idx + marker.length).trim();
                
                return (
                  <View>
                    {textPart.length > 0 && (
                      <Text className="text-[15px] leading-6 text-zinc-700 dark:text-zinc-300 mb-3">
                        {textPart}
                      </Text>
                    )}
                    <View className="flex-row items-center gap-1.5 rounded-2xl bg-[#007AFF]/10 p-3">
                      <Text className="text-[14px] font-semibold text-zinc-800 dark:text-zinc-200">Meeting Room:</Text>
                      <Pressable onPress={() => Linking.openURL(linkPart)} className="flex-1">
                        <Text className="text-[14px] font-semibold text-[#007AFF] underline" numberOfLines={1}>
                          {linkPart}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })()}
            </View>
          </View>
        )}

        {/* Calendar Link Redirect */}
        {task.isFromCalender && task.calenderEventId && (
          <View className="mx-5 mt-4">
            <Pressable
              onPress={() => {
                const url = `https://calendar.google.com/calendar/r/eventedit/${task.calenderEventId}`;
                Linking.openURL(url).catch(err => console.error("Error opening URL", err));
              }}
              className="rounded-3xl bg-[#007AFF]/10 border border-[#007AFF]/20 px-4 py-3.5 flex-row items-center justify-center active:opacity-80"
            >
              <Text className="text-[15px] font-semibold text-[#007AFF]">🗓 Open in Google Calendar</Text>
            </Pressable>
          </View>
        )}

        {/* Micro Steps */}
        {!parentTask && microSteps && microSteps.length > 0 && (
          <View className="mx-5 mt-6">
            <Text className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400 mb-2 ml-1">
              Micro Steps
            </Text>
            <View className="rounded-3xl bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 overflow-hidden"
            >
              {microSteps.map((step, index) => {
                const isLast = index === microSteps.length - 1;
                const stepCompleted = step.status === 'COMPLETED';
                return (
                  <Pressable
                    key={step.id}
                    onPress={() => navigation.navigate('TaskDetail', { taskId: step.id })}
                    className={`flex-row items-center px-4 py-3.5 ${!isLast ? 'border-b border-zinc-100 dark:border-zinc-800' : ''}`}
                    android_ripple={{ color: isDark ? '#2C2C2E' : '#F2F2F7' }}
                  >
                    <View className={`h-[22px] w-[22px] items-center justify-center rounded-full border-[1.8px] mr-3 ${stepCompleted ? 'border-[#34C759] bg-[#34C759]' : 'border-zinc-300 dark:border-zinc-600'}`}>
                      {stepCompleted && <Text className="text-[11px] font-bold text-white leading-[13px]">✓</Text>}
                    </View>
                    <View className="flex-1">
                      <Text className={`text-[15px] font-medium ${stepCompleted ? 'text-zinc-400 line-through dark:text-zinc-600' : 'text-black dark:text-white'}`}>
                        {step.title}
                      </Text>
                      {step.description && (
                        <Text className="text-[12px] text-zinc-400 dark:text-zinc-500 mt-0.5" numberOfLines={1}>
                          {step.description}
                        </Text>
                      )}
                    </View>
                    <ChevronRight size={16} color={isDark ? '#636366' : '#C7C7CC'} strokeWidth={2} />
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

      </ScrollView>
      {renderCustomAlert()}
    </SafeAreaView>
  );
};

export default TaskDetailScreen;
