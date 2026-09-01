import { axiosClient } from './axiosClient';

export interface SignupPayload {
  fname: string;
  lname: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  accesstoken: string;
  refreshtoken: string;
  message: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fname: string;
  lname: string;
  height: number | null;
  weight: number | null;
  sleepTarget: number | null;
  hobbies: string[];
}

export const authApi = {
  signup: async (payload: SignupPayload): Promise<AuthResponse> => {
    const response = await axiosClient.post<AuthResponse>('/api/auth/signup', payload);
    return response.data;
  },

  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const response = await axiosClient.post<AuthResponse>('/api/auth/login', payload);
    return response.data;
  },

  refresh: async (refreshToken: string): Promise<AuthResponse> => {
    const response = await axiosClient.post<AuthResponse>('/api/auth/refresh-token', {
      refreshtoken: refreshToken,
    });
    return response.data;
  },

  getMe: async (): Promise<UserProfile> => {
    const response = await axiosClient.get<UserProfile>('/api/auth/me');
    return response.data;
  },

  updateProfile: async (payload: Partial<UserProfile>): Promise<UserProfile> => {
    const response = await axiosClient.put<UserProfile>('/api/auth/me', payload);
    return response.data;
  },
};

