import { axiosClient } from './axiosClient';

export interface StepBucketResponse {
  success: boolean;
  message: string;
  totalSteps: number;
  bucket1: number;
  bucket2: number;
  bucket3: number;
  bucket4: number;
}

export interface SleepRecordResponse {
  success: boolean;
  message: string;
  totalSleepHours: number | null;
  sleepStartTime: number | null;   // Unix epoch ms
  sleepEndTime: number | null;     // Unix epoch ms
  microAwakeningsCount: number | null;
  interruptionTimes: number[] | null;
  sleepDate: string | null;        // ISO date string
}

export const healthApi = {
  getStepsToday: async (): Promise<StepBucketResponse> => {
    const response = await axiosClient.get<StepBucketResponse>('/api/core/health/steps/today');
    return response.data;
  },

  getLatestSleep: async (): Promise<SleepRecordResponse> => {
    const response = await axiosClient.get<SleepRecordResponse>('/api/core/health/sleep/latest');
    return response.data;
  },

  getWeeklySleep: async (): Promise<SleepRecordResponse[]> => {
    const response = await axiosClient.get<SleepRecordResponse[]>('/api/core/health/sleep/weekly');
    return response.data;
  },
};
