import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User,
  Mail,
  Scale,
  Ruler,
  Plus,
  X,
  Check,
  Edit2,
  LogOut,
  Moon,
} from 'lucide-react-native';
import { useAuth } from '../../store/AuthContext';
import { authApi, UserProfile } from '../../api/authApi';
import { useTheme } from '../../theme/ThemeContext';

const ProfileScreen: React.FC = () => {
  const { logout } = useAuth();
  const { isDark } = useTheme();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Inline editing states
  const [activeEditField, setActiveEditField] = useState<'fname' | 'lname' | 'height' | 'weight' | 'sleepTarget' | null>(null);
  const [editValues, setEditValues] = useState({
    fname: '',
    lname: '',
    height: '',
    weight: '',
    sleepTarget: '',
  });

  // Hobbies adding state
  const [isAddingHobby, setIsAddingHobby] = useState(false);
  const [newHobbyText, setNewHobbyText] = useState('');

  // Fetch profile on mount
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await authApi.getMe();
      setProfile(data);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      Alert.alert('Error', 'Could not load your profile details.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;

    try {
      setIsLoggingOut(true);
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Inline Edit handlers
  const handleStartEdit = (field: 'fname' | 'lname' | 'height' | 'weight' | 'sleepTarget', currentVal: string) => {
    setActiveEditField(field);
    setEditValues((prev) => ({
      ...prev,
      [field]: currentVal,
    }));
  };

  const handleCancelEdit = () => {
    setActiveEditField(null);
  };

  const handleFieldChange = (field: 'fname' | 'lname' | 'height' | 'weight' | 'sleepTarget', value: string) => {
    setEditValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveField = async (field: 'fname' | 'lname' | 'height' | 'weight' | 'sleepTarget') => {
    if (!profile) return;
    const rawValue = editValues[field].trim();
    let updatedValue: any = rawValue;

    if (field === 'height' || field === 'weight' || field === 'sleepTarget') {
      if (rawValue === '') {
        updatedValue = null;
      } else {
        const parsed = parseFloat(rawValue);
        if (isNaN(parsed)) {
          Alert.alert('Invalid Number', 'Please enter a valid numeric value.');
          return;
        }
        if (field === 'sleepTarget' && (parsed < 2 || parsed > 16)) {
          Alert.alert('Invalid Goal', 'Sleep goal must be between 2 and 16 hours.');
          return;
        }
        updatedValue = parsed;
      }
    }

    try {
      const updatedPayload = {
        ...profile,
        [field]: updatedValue,
      };

      const res = await authApi.updateProfile(updatedPayload);
      setProfile(res);
      setActiveEditField(null);
    } catch (error) {
      console.error('Failed to update profile field:', error);
      Alert.alert('Update Error', 'Could not save profile changes.');
    }
  };

  // Hobbies handlers
  const handleAddHobby = async () => {
    if (!profile) return;
    const text = newHobbyText.trim();
    if (!text) {
      setIsAddingHobby(false);
      return;
    }

    if (profile.hobbies && profile.hobbies.includes(text)) {
      Alert.alert('Duplicate Hobby', 'This hobby is already in your list.');
      return;
    }

    const currentHobbies = profile.hobbies || [];
    const updatedHobbies = [...currentHobbies, text];

    try {
      const res = await authApi.updateProfile({
        ...profile,
        hobbies: updatedHobbies,
      });
      setProfile(res);
      setNewHobbyText('');
      setIsAddingHobby(false);
    } catch (error) {
      console.error('Failed to add hobby:', error);
      Alert.alert('Error', 'Failed to add hobby.');
    }
  };

  const handleDeleteHobby = async (hobbyToDelete: string) => {
    if (!profile) return;
    const currentHobbies = profile.hobbies || [];
    const updatedHobbies = currentHobbies.filter((h) => h !== hobbyToDelete);

    try {
      const res = await authApi.updateProfile({
        ...profile,
        hobbies: updatedHobbies,
      });
      setProfile(res);
    } catch (error) {
      console.error('Failed to delete hobby:', error);
      Alert.alert('Error', 'Failed to delete hobby.');
    }
  };

  const renderEditableRow = (
    label: string,
    field: 'fname' | 'lname' | 'height' | 'weight' | 'sleepTarget',
    value: string | number | null,
    icon: React.ReactNode,
    placeholder: string,
    keyboardType: 'default' | 'numeric' = 'default',
    suffix?: string
  ) => {
    const isEditing = activeEditField === field;
    const displayValue = value !== null && value !== undefined && value !== '' ? String(value) : '';

    return (
      <View className="flex-row items-center justify-between border-b border-zinc-100 py-3.5 dark:border-zinc-800/80">
        <View className="flex-row items-center flex-1">
          <View className="mr-3.5 h-8 w-8 items-center justify-center rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
            {icon}
          </View>
          <View className="flex-1 mr-2">
            <Text className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">{label}</Text>
            {isEditing ? (
              <View className="flex-row items-center mt-0.5">
                <TextInput
                  value={editValues[field]}
                  onChangeText={(text) => handleFieldChange(field, text)}
                  placeholder={placeholder}
                  keyboardType={keyboardType}
                  className="flex-1 text-[15px] font-semibold text-zinc-900 dark:text-white p-0 m-0"
                  autoFocus
                  placeholderTextColor={isDark ? '#4b5563' : '#9ca3af'}
                />
                {suffix && <Text className="text-[15px] font-semibold text-zinc-400 dark:text-zinc-500 ml-1">{suffix}</Text>}
              </View>
            ) : (
              <Text className="mt-0.5 text-[15px] font-semibold text-zinc-850 dark:text-zinc-200" numberOfLines={1}>
                {displayValue ? `${displayValue}${suffix ? ` ${suffix}` : ''}` : `Set ${label.toLowerCase()}`}
              </Text>
            )}
          </View>
        </View>

        {/* Actions */}
        {isEditing ? (
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => handleSaveField(field)}
              className="h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 active:opacity-75"
              hitSlop={10}
            >
              <Check size={14} color="#10B981" strokeWidth={2.8} />
            </Pressable>
            <Pressable
              onPress={handleCancelEdit}
              className="h-7 w-7 items-center justify-center rounded-full bg-zinc-150 dark:bg-zinc-800 active:opacity-75"
              hitSlop={10}
            >
              <X size={14} color={isDark ? '#E4E4E7' : '#71717A'} strokeWidth={2.8} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => handleStartEdit(field, displayValue)}
            className="h-7 w-7 items-center justify-center rounded-full bg-[#007AFF]/5 dark:bg-[#007AFF]/10 active:opacity-75"
            hitSlop={10}
          >
            <Edit2 size={13} color="#007AFF" strokeWidth={2.4} />
          </Pressable>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8F9FA] dark:bg-black justify-center items-center">
        <ActivityIndicator size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F8F9FA] dark:bg-black">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="flex-1 px-6 pt-2"
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Ambient Design Blobs matching Dashboard */}
          <View className="absolute -left-12 -top-6 h-32 w-32 rounded-full bg-indigo-200/40 dark:bg-indigo-950/40" />
          <View className="absolute -right-12 top-20 h-28 w-28 rounded-full bg-sky-200/40 dark:bg-sky-950/40" />

          {/* Screen Title */}
          <Text className="text-[32px] font-bold tracking-tight text-zinc-900 dark:text-white">Profile</Text>

          {/* User Header Section */}
          <View className="align-center items-center my-6">
            <View className="h-[96px] w-[96px] items-center justify-center rounded-full bg-[#007AFF]/5 dark:bg-[#007AFF]/10">
              <View className="h-[80px] w-[80px] items-center justify-center rounded-full border border-zinc-150 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
                <Text className="text-2xl font-bold text-[#007AFF] dark:text-indigo-400">
                  {profile ? `${profile.fname.charAt(0).toUpperCase()}${profile.lname ? profile.lname.charAt(0).toUpperCase() : ''}` : 'U'}
                </Text>
              </View>
            </View>
            <Text className="mt-3.5 text-xl font-bold text-zinc-900 dark:text-white">
              {profile ? `${profile.fname} ${profile.lname || ''}`.trim() : 'Zeno User'}
            </Text>
            <Text className="text-[13px] font-medium text-zinc-450 dark:text-zinc-500 mt-1">
              {profile?.email || 'user@zeno.app'}
            </Text>
          </View>

          {/* Account Details Card */}
          <View className="mt-4 rounded-[28px] border border-zinc-150 bg-white p-5 dark:border-zinc-800/80 dark:bg-zinc-900/40">
            <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-[#007AFF] dark:text-indigo-300 mb-2">Account Details</Text>
            {renderEditableRow('First Name', 'fname', profile?.fname || '', <User size={15} color="#007AFF" />, 'Enter first name')}
            {renderEditableRow('Last Name', 'lname', profile?.lname || '', <User size={15} color="#007AFF" />, 'Enter last name')}
            
            {/* Email Address (Read Only) */}
            <View className="flex-row items-center justify-between py-3.5">
              <View className="flex-row items-center flex-1">
                <View className="mr-3.5 h-8 w-8 items-center justify-center rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                  <Mail size={15} color={isDark ? '#8E8E93' : '#8E8E93'} />
                </View>
                <View className="flex-1 mr-2">
                  <Text className="text-[10px] font-bold text-zinc-450 dark:text-zinc-550 uppercase tracking-wider">Email Address</Text>
                  <Text className="mt-0.5 text-[15px] font-semibold text-zinc-400 dark:text-zinc-500" numberOfLines={1}>
                    {profile?.email || ''}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Physical Stats Card */}
          <View className="mt-4 rounded-[28px] border border-zinc-150 bg-white p-5 dark:border-zinc-800/80 dark:bg-zinc-900/40">
            <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-[#007AFF] dark:text-indigo-300 mb-2">Physical Metrics</Text>
            {renderEditableRow('Height', 'height', profile?.height ?? null, <Ruler size={15} color="#007AFF" />, 'Enter height', 'numeric', 'cm')}
            {renderEditableRow('Weight', 'weight', profile?.weight ?? null, <Scale size={15} color="#007AFF" />, 'Enter weight', 'numeric', 'kg')}
          </View>

          {/* Sleep Settings Card */}
          <View className="mt-4 rounded-[28px] border border-zinc-150 bg-white p-5 dark:border-zinc-800/80 dark:bg-zinc-900/40">
            <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-[#007AFF] dark:text-indigo-300 mb-2">Sleep Settings</Text>
            {renderEditableRow('Sleep Goal', 'sleepTarget', profile?.sleepTarget ?? 8, <Moon size={15} color="#007AFF" />, 'Enter sleep target', 'numeric', 'hours')}
          </View>

          {/* Hobbies Card */}
          <View className="mt-4 rounded-[28px] border border-zinc-150 bg-white p-5 dark:border-zinc-800/80 dark:bg-zinc-900/40">
            <Text className="text-[11px] font-bold uppercase tracking-[1.5px] text-[#007AFF] dark:text-indigo-300 mb-3">Hobbies & Interests</Text>
            
            <View className="flex-row flex-wrap gap-2 mb-2">
              {profile?.hobbies && profile.hobbies.length > 0 ? (
                profile.hobbies.map((hobby, index) => (
                  <View
                    key={index}
                    className="flex-row items-center rounded-full bg-zinc-50 dark:bg-zinc-800/50 px-3.5 py-1.5 border border-zinc-200/50 dark:border-zinc-700/50 shadow-sm"
                  >
                    <Text className="text-[13px] font-medium text-zinc-800 dark:text-zinc-200 mr-2">{hobby}</Text>
                    <Pressable onPress={() => handleDeleteHobby(hobby)} className="p-0.5" hitSlop={8}>
                      <X size={12} color={isDark ? '#A1A1AA' : '#71717A'} strokeWidth={2.4} />
                    </Pressable>
                  </View>
                ))
              ) : (
                <Text className="text-sm text-zinc-400 dark:text-zinc-500 italic mb-2">No hobbies added yet. Tell us what you love!</Text>
              )}
            </View>

            {/* Inline Slot Add Field */}
            {isAddingHobby ? (
              <View className="flex-row items-center border border-zinc-200 dark:border-zinc-700 rounded-full px-3.5 py-1.5 bg-zinc-50 dark:bg-zinc-900/60 mt-2">
                <TextInput
                  value={newHobbyText}
                  onChangeText={setNewHobbyText}
                  placeholder="Type hobby..."
                  placeholderTextColor={isDark ? '#4b5563' : '#9ca3af'}
                  className="flex-1 text-[13px] font-semibold text-zinc-900 dark:text-white p-0 m-0"
                  autoFocus
                  onSubmitEditing={handleAddHobby}
                />
                <View className="flex-row gap-2 ml-2">
                  <Pressable onPress={handleAddHobby} className="h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15" hitSlop={8}>
                    <Check size={12} color="#10B981" strokeWidth={2.8} />
                  </Pressable>
                  <Pressable onPress={() => { setIsAddingHobby(false); setNewHobbyText(''); }} className="h-6 w-6 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-800" hitSlop={8}>
                    <X size={12} color={isDark ? '#A1A1AA' : '#71717A'} strokeWidth={2.8} />
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={() => setIsAddingHobby(true)}
                className="flex-row items-center justify-center rounded-full border border-dashed border-[#007AFF]/40 py-2.5 mt-2 active:bg-[#007AFF]/5"
              >
                <Plus size={14} color="#007AFF" strokeWidth={2.5} className="mr-1.5" />
                <Text className="text-[12px] font-bold text-[#007AFF] tracking-[0.5px]">ADD HOBBY</Text>
              </Pressable>
            )}
          </View>

          {/* Logout Button */}
          <Pressable
            className="my-8 items-center justify-center rounded-[24px] border border-red-200 bg-red-50/50 px-4 py-4 dark:border-red-950/55 dark:bg-red-950/20 active:opacity-75"
            onPress={handleLogout}
            disabled={isLoggingOut}
          >
            <View className="flex-row items-center justify-center gap-2">
              <LogOut size={16} color="#DC2626" strokeWidth={2.2} />
              <Text className="text-sm font-semibold tracking-[0.5px] text-red-700 dark:text-red-300">
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </Text>
            </View>
          </Pressable>
          
          {/* Bottom spacing for ScrollView */}
          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ProfileScreen;
