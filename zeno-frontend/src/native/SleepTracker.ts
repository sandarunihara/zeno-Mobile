import { NativeModules, Platform } from 'react-native';

const { SleepTracker } = NativeModules;

export interface SleepTrackerInterface {
  startTracking(accessToken: string, refreshToken: string, userId: string, apiBaseUrl: string): Promise<boolean>;
  stopTracking(): Promise<boolean>;
  isTrackingActive(): Promise<boolean>;
  getLocalEvents(): Promise<string>;
}

export default (Platform.OS === 'android' ? SleepTracker : {
  startTracking: () => Promise.resolve(false),
  stopTracking: () => Promise.resolve(false),
  isTrackingActive: () => Promise.resolve(false),
  getLocalEvents: () => Promise.resolve('[]'),
}) as SleepTrackerInterface;
