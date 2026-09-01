import React, { useState, useEffect, useCallback } from 'react';
import { Pressable, Text, View, ActivityIndicator, Alert, Image, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { axiosClient } from '../../api/axiosClient';
import { Mail, CheckCircle2, AlertCircle, RefreshCw, ShieldCheck, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useNavigation } from '@react-navigation/native';

GoogleSignin.configure({
  scopes: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events.readonly'
  ],
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '636937484642-75d0g92ab923ucc30fqjgl8a9hh0ahln.apps.googleusercontent.com',
  offlineAccess: true, // Requires offline access to get serverAuthCode
  forceCodeForRefreshToken: true,
});

const SubscriptionGhostbusterScreen: React.FC = () => {
  const { isDark } = useTheme();
  const navigation = useNavigation<any>();
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const checkConnectionStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await axiosClient.get('/api/auth/me');
      
      if (response.data && response.data.gmailToken) {
        setGmailConnected(true);
        setConnectedEmail(response.data.email);
        
        const subResponse = await axiosClient.get('/api/core/sub/user');
        setSubscriptions(subResponse.data || []);
      } else {
        setGmailConnected(false);
        setConnectedEmail(null);
        setSubscriptions([]);
      }
    } catch (error) {
      console.error('Error fetching connection status:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await axiosClient.get('/api/auth/me');
      if (response.data && response.data.gmailToken) {
        setGmailConnected(true);
        setConnectedEmail(response.data.email);
        const subResponse = await axiosClient.get('/api/core/sub/user');
        setSubscriptions(subResponse.data || []);
      } else {
        setGmailConnected(false);
        setConnectedEmail(null);
        setSubscriptions([]);
      }
    } catch (error) {
      console.error('Error refreshing connection status:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    checkConnectionStatus();
  }, [checkConnectionStatus]);

  const handleConnectGmail = async () => {
    if (isConnecting) return;

    try {
      setIsConnecting(true);
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      if (response.type === 'success') {
        const userInfo = response.data;
        if (userInfo.serverAuthCode) {
          const emailToUse = userInfo.user.email;
          
          // Connect Gmail via backend - it will associate the token to the logged in Zeno user via JWT
          await axiosClient.post('/api/auth/connect-gmail', {
            email: emailToUse,
            gmailToken: userInfo.serverAuthCode
          });

          Alert.alert('Success', 'Gmail Connected Successfully! Subscriptions will be extracted.');
          await checkConnectionStatus();
        } else {
          Alert.alert('Error', 'Failed to retrieve authorization code from Google.');
        }
      } else if (response.type === 'cancelled') {
        console.log('User cancelled the login flow');
      } else {
        console.log('Other response type:', response);
      }
    } catch (error: any) {
      if (error.code === statusCodes.IN_PROGRESS) {
        console.log('Sign in is in progress already');
      } else {
        console.error('Play services error or other error:', error);
        Alert.alert('Failed to connect Gmail', 'Please ensure you have registered your Google Account as a tester and try again.');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black">
      <View className="flex-1 bg-white dark:bg-black">
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 120 }}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              colors={["#007AFF"]} 
              tintColor={isDark ? "#FFFFFF" : "#007AFF"}
            />
          }
        >
          {/* Header */}
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-4xl font-bold tracking-tight text-black dark:text-white">
              Ghostbuster
            </Text>
          </View>

          {/* Social Shield Navigation Card */}
          <Pressable
            onPress={() => navigation.navigate('SocialBattery')}
            className="rounded-3xl bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 px-4 py-4 mb-4 mt-3 active:opacity-80"
            style={{
              shadowColor: '#007AFF',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDark ? 0.12 : 0.06,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <View className="flex-row items-center">
              <View className="h-11 w-11 items-center justify-center rounded-2xl bg-[#007AFF]/10 mr-3">
                <ShieldCheck size={22} color="#007AFF" />
              </View>
              <View className="flex-1">
                <Text className="text-[16px] font-semibold text-black dark:text-white">
                  Social Shield
                </Text>
                <Text className="text-[13px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                  AI-powered polite decline generator
                </Text>
              </View>
              <ChevronRight size={18} color="#C7C7CC" />
            </View>
          </Pressable>

          {/* Connection Status & Refresh Action Bar */}
          <View className="flex-row items-center justify-between mb-4 mt-2">
            <View className="flex-row items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black px-4 py-2">
              {gmailConnected ? (
                <>
                  <View className="h-2.5 w-2.5 rounded-full bg-[#34C759]" />
                  <Text className="text-[14px] font-semibold text-black dark:text-white">
                    {connectedEmail || 'Gmail Active'}
                  </Text>
                </>
              ) : (
                <>
                  <View className="h-2.5 w-2.5 rounded-full bg-[#FF3B30]" />
                  <Text className="text-[14px] font-semibold text-black dark:text-white">
                    Gmail Disconnected
                  </Text>
                </>
              )}
            </View>
            <Pressable
              onPress={onRefresh}
              disabled={refreshing || isLoading}
              className="h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black"
              android_ripple={{ color: isDark ? '#2C2C2E' : '#F2F2F7', radius: 18 }}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="#8E8E93" />
              ) : (
                <RefreshCw size={16} color="#8E8E93" strokeWidth={1.9} />
              )}
            </Pressable>
          </View>

          {/* Automatic Scanner Description Card */}
          <View className="rounded-3xl bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 px-5 py-4 mb-5">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-[13px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                AUTOMATIC SCANNER
              </Text>
              <View className="rounded-full bg-[#007AFF]/10 px-3 py-1">
                <Text className="text-[11px] font-semibold text-[#007AFF]">Inbox Monitor</Text>
              </View>
            </View>
            <Text className="text-[15px] text-zinc-600 dark:text-zinc-300 leading-[22px]">
              Subscription Ghostbuster scans your email receipts to automatically detect subscriptions, billing dates, and cost changes so you never pay for a forgotten trial.
            </Text>
          </View>

          {isLoading ? (
            <View className="items-center py-16">
              <ActivityIndicator size="large" color="#007AFF" />
            </View>
          ) : !gmailConnected ? (
            /* Gmail is NULL - Show Connect Button */
            <View className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black p-6 items-center">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-[#007AFF]/10 mb-4">
                <Mail size={30} color="#007AFF" />
              </View>
              <Text className="text-lg font-bold text-black dark:text-white">
                Connect Your Inbox
              </Text>
              <Text className="mt-2 text-center text-sm text-zinc-500 dark:text-zinc-400 leading-[20px] px-2">
                Grant read-only access to your receipts to let Zeno identify hidden charges and trial expiries.
              </Text>
              
              <Pressable
                className="mt-6 w-full flex-row items-center justify-center rounded-full bg-[#007AFF] py-3.5 active:opacity-85"
                onPress={handleConnectGmail}
                disabled={isConnecting}
                style={{
                  shadowColor: '#007AFF',
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.25,
                  shadowRadius: 6,
                  elevation: 4,
                }}
              >
                {isConnecting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-[16px] font-semibold text-white">
                    Connect Gmail
                  </Text>
                )}
              </Pressable>
              
              <View className="mt-4 flex-row items-center justify-center gap-1.5">
                <AlertCircle size={13} color="#8E8E93" />
                <Text className="text-xs text-zinc-400 dark:text-zinc-500">
                  Secure read-only access to receipts only.
                </Text>
              </View>
            </View>
          ) : subscriptions.length === 0 ? (
            /* Empty state: Show the scanning message */
            <View className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black p-6 items-center">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-[#34C759]/10 mb-4">
                <CheckCircle2 size={30} color="#34C759" />
              </View>
              <Text className="text-lg font-bold text-black dark:text-white">
                Inbox Scanning Active
              </Text>
              <Text className="mt-3 text-center text-sm text-zinc-500 dark:text-zinc-400 leading-[22px] px-2">
                Zeno is automatically scanning your inbox for new subscriptions. Any identified trials or bills will appear here shortly.
              </Text>
            </View>
          ) : (
            /* List state: Show the subscriptions */
            <View className="mt-2">
              <Text className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400 mb-3 ml-1">
                Detected Subscriptions ({subscriptions.length})
              </Text>
              
              {subscriptions.map((sub) => {
                const initial = sub.serviceName ? sub.serviceName.charAt(0).toUpperCase() : '?';
                const isActive = sub.status && sub.status.toUpperCase() === 'ACTIVE';
                return (
                  <View 
                    key={sub.id} 
                    className="mb-3 flex-row items-center justify-between rounded-3xl bg-white dark:bg-black border border-zinc-100 dark:border-zinc-800 p-4"
                  >
                    <View className="flex-row items-center gap-3 flex-1">
                      {/* Avatar */}
                      {sub.avatarUrl ? (
                        <Image 
                          source={{ uri: sub.avatarUrl }} 
                          className="h-11 w-11 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="h-11 w-11 items-center justify-center rounded-full bg-[#007AFF]/10">
                          <Text className="text-[17px] font-bold text-[#007AFF]">{initial}</Text>
                        </View>
                      )}
                      
                      {/* Service name and details */}
                      <View className="flex-1">
                        <Text className="text-[16px] font-semibold text-black dark:text-white">
                          {sub.serviceName}
                        </Text>
                        <View className="flex-row items-center gap-1.5 mt-0.5 flex-wrap">
                          <Text className="text-xs text-zinc-400 dark:text-zinc-500">
                            {sub.billingCycle}
                          </Text>
                          <Text className="text-xs text-zinc-300 dark:text-zinc-700">•</Text>
                          <View className="flex-row items-center gap-1">
                            <View className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-[#34C759]' : 'bg-zinc-400'}`} />
                            <Text className={`text-xs font-medium ${isActive ? 'text-green-600 dark:text-green-400' : 'text-zinc-400 dark:text-zinc-500'}`}>
                              {sub.status}
                            </Text>
                          </View>
                          {sub.paymentDate && (
                            <>
                              <Text className="text-xs text-zinc-300 dark:text-zinc-700">•</Text>
                              <Text className="text-xs text-zinc-400 dark:text-zinc-500">
                                Payment: {sub.paymentDate}
                              </Text>
                            </>
                          )}
                        </View>
                      </View>
                    </View>

                    {/* Cost */}
                    <View className="items-end">
                      <Text className="text-[16px] font-bold text-black dark:text-white">
                        {sub.currency} {sub.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default SubscriptionGhostbusterScreen;
