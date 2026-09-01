import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform, DeviceEventEmitter } from 'react-native';

const RAW_API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080';
const ANDROID_API_BASE_URL = process.env.EXPO_PUBLIC_ANDROID_API_BASE_URL;

const resolveApiBaseUrl = (): string => {
  if (Platform.OS === 'android' && ANDROID_API_BASE_URL) {
    return ANDROID_API_BASE_URL;
  }

  // Android emulator cannot reach host machine via localhost/127.0.0.1.
  if (Platform.OS === 'android') {
    try {
      const parsedUrl = new URL(RAW_API_BASE_URL);
      if (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1') {
        parsedUrl.hostname = '10.0.2.2';
        return parsedUrl.toString().replace(/\/$/, '');
      }
    } catch (error) {
      console.warn('Invalid EXPO_PUBLIC_API_BASE_URL. Falling back to raw value.', error);
    }
  }

  return RAW_API_BASE_URL;
};

export const API_BASE_URL = resolveApiBaseUrl();

export const axiosClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

type RetryableRequestConfig = {
  _retry?: boolean;
  headers?: Record<string, string>;
  url?: string;
};

let refreshPromise: Promise<string | null> | null = null;

const isAuthRoute = (url?: string): boolean => {
  if (!url) {
    return false;
  }
  return (
    url.includes('/api/auth/login') ||
    url.includes('/api/auth/signup') ||
    url.includes('/api/auth/refresh') ||
    url.includes('/api/auth/refresh-token')
  );
};

const isInvalidTokenResponse = (error: AxiosError): boolean => {
  const status = error.response?.status;
  const payloadMessage = (error.response?.data as { message?: string } | undefined)?.message;
  const rawMessage = typeof payloadMessage === 'string' ? payloadMessage : error.message;
  const normalizedMessage = rawMessage.toLowerCase();

  // Core service can surface invalid JWT as 400/500 instead of 401.
  // We also check for 403 Forbidden which some gateways return for expired tokens.
  return (
    status === 401 ||
    status === 403 ||
    normalizedMessage.includes('invalid token') ||
    normalizedMessage.includes('expired token') ||
    normalizedMessage.includes('token expired') ||
    normalizedMessage.includes('unauthorized')
  );
};

const requestTokenRefresh = async (): Promise<string | null> => {
  try {
    const refreshToken = await SecureStore.getItemAsync('refreshToken');

    if (!refreshToken) {
      console.warn('No refresh token found in SecureStore.');
      return null;
    }

    // Use axiosClient to benefit from baseURL and other defaults, 
    // but pass a flag or handle it to avoid infinite loops if needed.
    // However, isAuthRoute already prevents the interceptor from re-triggering.
    const refreshResponse = await axios.post(`${API_BASE_URL}/api/auth/refresh-token`, {
      refreshtoken: refreshToken,
    });

    const { accesstoken: newAccessToken, refreshtoken: newRefreshToken } = refreshResponse.data as {
      accesstoken: string;
      refreshtoken?: string;
    };

    if (!newAccessToken) {
      console.error('Refresh response did not contain an access token.');
      return null;
    }

    await SecureStore.setItemAsync('accessToken', newAccessToken);
    if (newRefreshToken) {
      await SecureStore.setItemAsync('refreshToken', newRefreshToken);
    }

    return newAccessToken;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Refresh API call failed:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
    } else {
      console.error('Unexpected error during token refresh:', error);
    }
    throw error;
  }
};

// Request interceptor: Add access token to every request
axiosClient.interceptors.request.use(
  async (config) => {
    try {
      // Don't add Authorization header to auth routes
      if (isAuthRoute(config.url)) {
        return config;
      }

      const accessToken = await SecureStore.getItemAsync('accessToken');
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
    } catch (error) {
      console.error('Error retrieving token from SecureStore:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle 401 and refresh token
axiosClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = (error.config || {}) as RetryableRequestConfig;

    // If it's an auth route, don't try to refresh (to avoid loops)
    if (isAuthRoute(originalRequest.url)) {
      return Promise.reject(error);
    }

    if (isInvalidTokenResponse(error) && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = requestTokenRefresh();
        }

        const newAccessToken = await refreshPromise;
        refreshPromise = null;

        if (!newAccessToken) {
          await SecureStore.deleteItemAsync('accessToken');
          await SecureStore.deleteItemAsync('refreshToken');
          return Promise.reject(error);
        }

        originalRequest.headers = {
          ...(originalRequest.headers || {}),
          Authorization: `Bearer ${newAccessToken}`,
        };

        return axiosClient(originalRequest);
      } catch (refreshError) {
        // Token refresh failed (e.g. refresh token expired)
        refreshPromise = null;
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
        
        // Trigger a logout event to notify AuthContext
        console.error('Token refresh failed, tokens cleared. Emitting auth:logout event.');
        DeviceEventEmitter.emit('auth:logout');
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
