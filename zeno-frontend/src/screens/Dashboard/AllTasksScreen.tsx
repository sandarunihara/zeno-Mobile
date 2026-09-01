import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertTriangle, ChevronDown, ChevronRight, Clock, ArrowLeft, Plus, Flag } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { dashboardApi, Task } from '../../api/dashboardApi';
import { useNavigation } from '@react-navigation/native';
import CreateTaskModal from '../../components/Dashboard/CreateTaskModal';

const AllTasksScreen: React.FC = () => {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<any>();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkedTasks, setCheckedTasks] = useState<Record<number, boolean>>({});
  const [expandedTasks, setExpandedTasks] = useState<Record<number, boolean>>({});
  const [isCreateTaskVisible, setIsCreateTaskVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'tasks' | 'calendar'>('tasks');

  const fetchTasks = async () => {
    try {
      const allTasks = await dashboardApi.getAllTasks();
      setTasks(allTasks);
    } catch (error) {
      console.error("Failed to fetch all tasks", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

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

  const isUrgent = (deadline?: string | null) => {
    if (!deadline) return false;
    const diff = new Date(deadline).getTime() - new Date().getTime();
    return diff > 0 && diff <= 48 * 60 * 60 * 1000;
  };

  const formatDeadline = (deadline?: string | null) => {
    if (!deadline) return null;
    const d = new Date(deadline);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = d.toDateString() === tomorrow.toDateString();
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isToday) return `Today, ${time}`;
    if (isTomorrow) return `Tomorrow, ${time}`;
    return `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}, ${time}`;
  };

  const renderCheck = (checked: boolean) => (
    <View
      className={[
        'h-[22px] w-[22px] items-center justify-center rounded-full border-[1.8px]',
        checked
          ? 'border-[#34C759] bg-[#34C759]'
          : 'border-zinc-300 dark:border-zinc-600',
      ].join(' ')}
    >
      {checked ? (
        <Text className="text-[11px] font-bold text-white leading-[13px]">✓</Text>
      ) : null}
    </View>
  );

  const renderEffortBadge = (effort: string) => {
    const config: Record<string, { color: string; emoji: string }> = {
      Low: { color: 'text-green-600 dark:text-green-400', emoji: '🍃' },
      Medium: { color: 'text-orange-600 dark:text-orange-400', emoji: '⚡' },
      High: { color: 'text-red-600 dark:text-red-400', emoji: '🔥' },
    };
    const c = config[effort] ?? config.Medium;
    return (
      <Text className={`text-[11px] font-semibold ${c.color}`}>
        {c.emoji} {effort}
      </Text>
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
        className="mb-3 rounded-3xl bg-white dark:bg-black border border-zinc-100 dark:border-zinc-800 overflow-hidden"
      >
        <Pressable
          className="flex-row items-center px-4 py-3.5"
          onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
          android_ripple={{ color: isDark ? '#2C2C2E' : '#F2F2F7' }}
        >
          {/* Checkbox */}
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

          {/* Content */}
          <View className="flex-1 mr-2">
            <View className="flex-row items-center gap-2">
              <Text
                className={[
                  'flex-1 text-[16px] font-medium',
                  (checked || isCompleted)
                    ? 'text-zinc-400 line-through dark:text-zinc-600'
                    : 'text-black dark:text-white',
                ].join(' ')}
                numberOfLines={2}
              >
                {task.title}
              </Text>
              {task.is_critical && (
                <Flag size={13} color="#FF3B30" fill="#FF3B30" />
              )}
            </View>

            {/* Meta row */}
            <View className="flex-row items-center gap-3 mt-1.5">
              {renderEffortBadge(task.effort_level)}
              {deadline && (
                <View className="flex-row items-center gap-1">
                  {urgent ? (
                    <AlertTriangle size={10} color="#FF3B30" strokeWidth={2.4} />
                  ) : (
                    <Clock size={10} color={isDark ? '#8E8E93' : '#8E8E93'} strokeWidth={2.4} />
                  )}
                  <Text className={`text-[11px] font-medium ${urgent ? 'text-red-500' : 'text-zinc-400 dark:text-zinc-500'}`}>
                    {deadline}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Expand chevron */}
          {hasMicro && (
            <Pressable
              onPress={(e) => { e.stopPropagation(); toggleExpanded(task.id); }}
              hitSlop={10}
              className="p-1"
            >
              {expanded
                ? <ChevronDown size={16} color={isDark ? '#636366' : '#C7C7CC'} strokeWidth={2.2} />
                : <ChevronRight size={16} color={isDark ? '#636366' : '#C7C7CC'} strokeWidth={2.2} />
              }
            </Pressable>
          )}
        </Pressable>

        {/* Micro-steps */}
        {hasMicro && expanded && task.microSteps ? (
          <View className="border-t border-zinc-100 dark:border-zinc-800">
            {task.microSteps.map((step, index) => {
              const stepChecked = !!checkedTasks[step.id];
              const isLast = index === task.microSteps!.length - 1;
              return (
                <Pressable
                  key={step.id}
                  className={`flex-row items-center pl-[52px] pr-4 py-2.5 ${!isLast ? 'border-b border-zinc-100 dark:border-zinc-800' : ''}`}
                  onPress={() => navigation.navigate('TaskDetail', { taskId: step.id })}
                  android_ripple={{ color: isDark ? '#2C2C2E' : '#F2F2F7' }}
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
                        'text-[14px]',
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

  const filteredTasks = tasks.filter((t) => {
    if (activeTab === 'tasks') return true;
    return !!t.isFromCalender;
  });

  const pendingTasks = filteredTasks.filter((t) => t.status !== 'COMPLETED');
  const completedTasks = filteredTasks.filter((t) => t.status === 'COMPLETED');
  const pendingCount = pendingTasks.length;

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black" edges={['top', 'left', 'right']}>
      {/* iOS-style large title header */}
      <View className="px-5 pt-2 pb-3 flex-row items-center">
        <Pressable
          onPress={() => navigation.goBack()}
          className="mr-2 p-1.5 -ml-1.5 rounded-full active:opacity-60"
          hitSlop={8}
        >
          <ArrowLeft size={24} color="#007AFF" />
        </Pressable>
        <View className="flex-1" />
        <Pressable 
          onPress={() => setIsCreateTaskVisible(true)}
          className="h-9 w-9 items-center justify-center rounded-full bg-[#007AFF] active:opacity-80"
          style={{
            shadowColor: '#007AFF',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.3,
            shadowRadius: 6,
            elevation: 4,
          }}
        >
          <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>
      </View>

      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
      >
        {/* Large Title */}
        <Text className="text-4xl font-bold tracking-tight text-black dark:text-white mb-1">
          All Tasks
        </Text>
        <Text className="text-[15px] text-zinc-400 dark:text-zinc-500 mb-5">
          {loading ? 'Loading...' : `${pendingCount} ${pendingCount === 1 ? 'task' : 'tasks'} remaining`}
        </Text>

        {/* Tabs for My Tasks vs Calendar Schedule */}
        <View className="flex-row rounded-full bg-zinc-100 dark:bg-zinc-900 p-1 mb-5">
          <Pressable
            onPress={() => setActiveTab('tasks')}
            className={`flex-1 py-2.5 rounded-full items-center justify-center ${
              activeTab === 'tasks' ? 'bg-white dark:bg-zinc-800' : ''
            }`}
            style={
              activeTab === 'tasks'
                ? {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.12,
                    shadowRadius: 1.5,
                    elevation: 2,
                  }
                : undefined
            }
          >
            <Text
              className={`text-sm font-semibold ${
                activeTab === 'tasks' ? 'text-black dark:text-white' : 'text-zinc-500'
              }`}
            >
              My Tasks
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('calendar')}
            className={`flex-1 py-2.5 rounded-full items-center justify-center ${
              activeTab === 'calendar' ? 'bg-white dark:bg-zinc-800' : ''
            }`}
            style={
              activeTab === 'calendar'
                ? {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.12,
                    shadowRadius: 1.5,
                    elevation: 2,
                  }
                : undefined
            }
          >
            <Text
              className={`text-sm font-semibold ${
                activeTab === 'calendar' ? 'text-black dark:text-white' : 'text-zinc-500'
              }`}
            >
              Calendar Events
            </Text>
          </Pressable>
        </View>

        {loading ? (
          <View className="items-center py-16">
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : filteredTasks.length === 0 ? (
          <View className="items-center py-16 rounded-3xl bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 px-6">
            <Text className="text-4xl mb-3">🎉</Text>
            <Text className="text-[17px] font-semibold text-black dark:text-white text-center">
              {activeTab === 'calendar' ? 'No Calendar Events' : 'No Tasks Yet'}
            </Text>
            <Text className="text-[14px] text-zinc-400 dark:text-zinc-500 mt-1 text-center">
              {activeTab === 'calendar' 
                ? "No calendar-synced tasks for today. Disconnect and reconnect on the Ghostbuster screen or trigger a sync if you have today's events."
                : 'Tap + to create your first task'}
            </Text>
          </View>
        ) : (
          <>
            {/* Pending Tasks */}
            {pendingTasks.length > 0 && (
              <View className="mb-6">
                {pendingTasks.map(renderTaskCard)}
              </View>
            )}

            {/* Completed Tasks */}
            {completedTasks.length > 0 && (
              <View>
                <Text className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400 mb-2 ml-1">
                  Completed
                </Text>
                {completedTasks.map(renderTaskCard)}
              </View>
            )}
          </>
        )}
      </ScrollView>
      <CreateTaskModal
        isVisible={isCreateTaskVisible}
        onClose={() => setIsCreateTaskVisible(false)}
        onSave={fetchTasks}
      />
    </SafeAreaView>
  );
};

export default AllTasksScreen;
