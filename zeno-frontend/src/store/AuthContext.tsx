import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DeviceEventEmitter } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { axiosClient, API_BASE_URL } from '../api/axiosClient';
import StepCounter, { requestActivityRecognitionPermission } from '../native/StepCounter';
import SleepTracker from '../native/SleepTracker';

const base64Decode = (str: string): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let buffer = '';
  const cleanStr = str.replace(/=+$/, '');
  for (let i = 0; i < cleanStr.length; i++) {
    const char = cleanStr[i];
    const idx = chars.indexOf(char);
    if (idx === -1) continue;
    buffer += idx.toString(2).padStart(6, '0');
  }
  let result = '';
  for (let i = 0; i + 8 <= buffer.length; i += 8) {
    const byte = buffer.substring(i, i + 8);
    result += String.fromCharCode(parseInt(byte, 2));
  }
  return result;
};

const getUserIdFromToken = (token: string): string => {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return '';
    const payloadStr = base64Decode(parts[1]);
    const payload = JSON.parse(payloadStr);
    return payload.jti || payload.id || '';
  } catch (e) {
    console.error('Error decoding token for userId:', e);
    return '';
  }
};

interface AuthContextType {
  isLoggedIn: boolean;
  isLoading: boolean;
  onboardingComplete: boolean;
  user: any;
  login: (email: string, password: string) => Promise<void>;
  signup: (fname: string, lname: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [user, setUser] = useState(null);

  // Check if user is already logged in on app launch
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const accessToken = await SecureStore.getItemAsync('accessToken');
        const onboardingFlag = await SecureStore.getItemAsync('onboarding_complete');

        if (onboardingFlag === 'true') {
          setOnboardingComplete(true);
        }

        if (accessToken) {
          setIsLoggedIn(true);
          
          // Verify or launch background service on app launch
          try {
            const refreshToken = await SecureStore.getItemAsync('refreshToken');
            const userId = getUserIdFromToken(accessToken);
            const hasPermission = await requestActivityRecognitionPermission();
            if (hasPermission) {
              await StepCounter.startService(String(accessToken), String(refreshToken), userId, API_BASE_URL);
            }
            await SleepTracker.startTracking(String(accessToken), String(refreshToken), userId, API_BASE_URL);
          } catch (err) {
            console.error('Failed to start tracking services on checkAuthStatus:', err);
          }
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();

    const logoutListener = DeviceEventEmitter.addListener('auth:logout', () => {
      setIsLoggedIn(false);
      setUser(null);
    });

    return () => {
      logoutListener.remove();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await axiosClient.post('/api/auth/login', {
        email,
        password,
      });

      const { accesstoken, refreshtoken } = response.data;

      await SecureStore.setItemAsync('accessToken', String(accesstoken));
      await SecureStore.setItemAsync('refreshToken', String(refreshtoken));

      setIsLoggedIn(true);

      // Start step counter background service
      try {
        const userId = getUserIdFromToken(accesstoken);
        const hasPermission = await requestActivityRecognitionPermission();
        if (hasPermission) {
          await StepCounter.startService(String(accesstoken), String(refreshtoken), userId, API_BASE_URL);
        }
        await SleepTracker.startTracking(String(accesstoken), String(refreshtoken), userId, API_BASE_URL);
      } catch (err) {
        console.error('Failed to start tracking services on login:', err);
      }
    } catch (error) {
      throw error;
    }
  }, []);

  const signup = useCallback(
    async (fname: string, lname: string, email: string, password: string) => {
      try {
        const response = await axiosClient.post('/api/auth/signup', {
          fname,
          lname,
          email,
          password,
        });
        console.log("Signup response:", response.data);


        const { accesstoken, refreshtoken } = response.data;

        await SecureStore.setItemAsync('accessToken', String(accesstoken));
        await SecureStore.setItemAsync('refreshToken', String(refreshtoken));

        setIsLoggedIn(true);

        // Start step counter background service
        try {
          const userId = getUserIdFromToken(accesstoken);
          const hasPermission = await requestActivityRecognitionPermission();
          if (hasPermission) {
            await StepCounter.startService(String(accesstoken), String(refreshtoken), userId, API_BASE_URL);
          }
          await SleepTracker.startTracking(String(accesstoken), String(refreshtoken), userId, API_BASE_URL);
        } catch (err) {
          console.error('Failed to start tracking services on signup:', err);
        }
      } catch (error) {
        throw error;
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      setIsLoggedIn(false);
      setUser(null);

      // Stop background tracking services
      try {
        await StepCounter.stopService();
        await SleepTracker.stopTracking();
      } catch (err) {
        console.error('Failed to stop tracking services on logout:', err);
      }
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }, []);

  const completeOnboarding = useCallback(async () => {
    try {
      await SecureStore.setItemAsync('onboarding_complete', 'true');
      setOnboardingComplete(true);
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        isLoading,
        onboardingComplete,
        user,
        login,
        signup,
        logout,
        completeOnboarding,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
