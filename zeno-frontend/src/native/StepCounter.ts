import { NativeModules, Platform, PermissionsAndroid } from 'react-native';

const { StepCounter } = NativeModules;

export interface StepCounterInterface {
  startService(accessToken: string, refreshToken: string, userId: string, apiBaseUrl: string): Promise<boolean>;
  stopService(): Promise<boolean>;
  isServiceRunning(): Promise<boolean>;
}

// Safer lookup for permissions to avoid TS compilation or runtime issues with React Native versions
const ACTIVITY_RECOGNITION_PERMISSION = 
  PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION || 'android.permission.ACTIVITY_RECOGNITION';
const POST_NOTIFICATIONS_PERMISSION = 
  (PermissionsAndroid.PERMISSIONS as any).POST_NOTIFICATIONS || 'android.permission.POST_NOTIFICATIONS';

/**
 * Requests required runtime permissions for physical activity tracking and foreground notifications.
 */
export const requestActivityRecognitionPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return false;

  try {
    // 1. Request Activity Recognition (Android 10+)
    if (Platform.Version >= 29) {
      const grantedActivity = await PermissionsAndroid.request(
        ACTIVITY_RECOGNITION_PERMISSION as any,
        {
          title: 'Physical Activity Tracking',
          message: 'Zeno needs access to your physical activity to count your steps and track your recovery battery in the background.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      if (grantedActivity !== PermissionsAndroid.RESULTS.GRANTED) {
        console.warn('Activity recognition permission denied');
        return false;
      }
    }

    // 2. Request Notification Posting (Android 13+)
    if (Platform.Version >= 33) {
      const grantedNotifications = await PermissionsAndroid.request(
        POST_NOTIFICATIONS_PERMISSION as any,
        {
          title: 'Background Status Notification',
          message: 'Zeno needs to show a background service notification to continuously sync physical steps.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      if (grantedNotifications !== PermissionsAndroid.RESULTS.GRANTED) {
        console.warn('Post notification permission denied');
        // Do not strictly block on notifications, but it is recommended
      }
    }

    return true;
  } catch (err) {
    console.error('Error requesting permissions:', err);
    return false;
  }
};

export default (Platform.OS === 'android' ? StepCounter : {
  startService: () => Promise.resolve(false),
  stopService: () => Promise.resolve(false),
  isServiceRunning: () => Promise.resolve(false),
}) as StepCounterInterface;
